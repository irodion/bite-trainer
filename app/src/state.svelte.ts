import { openPack, type UpdateResult } from './core/openPack'
import { answerEvents, composeSession, tzOffsetNow, unfinishedSession, type SessionItem } from './core/session'
import type { LogEvent, NewAttempt, NewEvent, Pack } from './core/types'
import { readStored, type UnknownEvent } from './core/progressLog'
import { addEvents, allStoredEvents, getMeta, instanceId, packStore, setMeta } from './store'

const OFFICIAL_PACK = 'packs/rust/pack.json'

export const app = $state({
  pack: undefined as Pack | undefined,
  events: [] as LogEvent[],
  /** Events of types this build does not know: kept and re-exported, never folded. */
  unknownEvents: [] as UnknownEvent[],
  /** Stored records that did not parse. Left in storage, kept out of folds and exports. */
  quarantined: 0,
  error: '',
  packUpdate: undefined as UpdateResult | undefined,
  persisted: undefined as boolean | undefined,
  session: undefined as { id: string; items: SessionItem[]; index: number; answeredBefore: number } | undefined,
  /** The Session whose end-of-Session summary is on screen. */
  summaryOf: undefined as string | undefined,
  /**
   * The current time as the screen knows it. Everything time-dependent on screen (due reviews, "done for today",
   * Streak) is derived from THIS, not from Date.now(), so that refreshing it re-derives them — and so that they
   * all see the same instant. Kept current by `keepTimeCurrent`.
   */
  now: Date.now(),
  tzOffsetMin: tzOffsetNow(),
})

/** How often a page that stays in the foreground re-reads the clock. A day boundary is noticed within this. */
const CLOCK_REFRESH_MS = 60_000

export function refreshNow() {
  app.now = Date.now()
  app.tzOffsetMin = tzOffsetNow()
}

/**
 * An installed app is resumed far more often than it is reloaded, so the clock is re-read whenever the page comes
 * back (visible again, restored from the back/forward cache, focused) and once a minute while it stays in front.
 * Returns a function that stops it.
 */
export function keepTimeCurrent(): () => void {
  const onResume = () => document.visibilityState === 'visible' && refreshNow()
  document.addEventListener('visibilitychange', onResume)
  window.addEventListener('pageshow', onResume)
  window.addEventListener('focus', onResume)
  const timer = setInterval(onResume, CLOCK_REFRESH_MS)
  return () => {
    document.removeEventListener('visibilitychange', onResume)
    window.removeEventListener('pageshow', onResume)
    window.removeEventListener('focus', onResume)
    clearInterval(timer)
  }
}

let instance = ''

export async function boot() {
  try {
    const [opened, events, id] = await Promise.all([
      openPack(OFFICIAL_PACK, { fetchFn: (...a) => fetch(...a), store: packStore }),
      allStoredEvents(),
      instanceId(),
    ])
    ;[app.pack, instance] = [opened.pack, id]
    useStored(events)
    app.persisted = await getMeta<boolean>('persisted')
    opened.update.then((r) => (app.packUpdate = r))
  } catch (e) {
    app.error = String(e)
  }
}

/** Stamps the events and appends them to the Progress Log in ONE transaction: all of them are stored, or none. */
export async function record(...events: NewEvent[]) {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a timestamp, never reactive state
  const now = new Date()
  const stamp = { instanceId: instance, at: now.getTime(), tzOffsetMin: now.getTimezoneOffset() }
  const full = events.map((e) => ({ ...e, ...stamp, id: crypto.randomUUID() }) as LogEvent)
  await addEvents(full)
  app.events.push(...full)
}

/** Starts today's Session — or continues the one left halfway, under the same Session id. */
export function startSession() {
  if (!app.pack) return
  refreshNow() // what is due is decided at the moment of the tap, never from a stale screen
  const events = $state.snapshot(app.events) as LogEvent[]
  const resume = unfinishedSession(events, app.now, app.tzOffsetMin)
  const items = composeSession(app.pack, events, app.now, resume)
  if (items.length)
    app.session = { id: resume?.id ?? crypto.randomUUID(), items, index: 0, answeredBefore: resume?.answered ?? 0 }
}

/** Leaving keeps every answer already given; the rest can be continued later today. */
export function leaveSession() {
  app.session = undefined
}

export async function nextExercise() {
  const s = app.session
  if (!s) return
  if (s.index + 1 < s.items.length) s.index++
  else {
    app.summaryOf = s.id
    app.session = undefined
  }
}

/**
 * Record an answer. Whether it completes the Session is decided from the Session as it is NOW, before any await:
 * the Learner may navigate while the write is pending, and `app.session` must not be re-read afterwards.
 * Rejects if the write fails; nothing is stored then, and the caller may retry.
 */
export async function recordAttempt(attempt: NewAttempt) {
  const s = app.session
  if (!s) return
  const events = answerEvents(attempt, { index: s.index, total: s.items.length })
  await record(...events)
  if (events.length > 1) void askToPersist()
}

/** After a completed Session there is something worth keeping: ask the browser not to evict it. */
async function askToPersist() {
  if (app.persisted || !navigator.storage?.persist) return
  app.persisted = await navigator.storage.persist()
  await setMeta('persisted', app.persisted)
}

function useStored(records: unknown[]) {
  const read = readStored(records)
  ;[app.events, app.unknownEvents, app.quarantined] = [read.events, read.unknown, read.quarantined]
}

/** Merge already-parsed events into the log (set union by event id). Returns how many were new. */
export async function importEvents(events: (LogEvent | UnknownEvent)[]): Promise<number> {
  const added = await addEvents(events)
  useStored(await allStoredEvents())
  return added
}
