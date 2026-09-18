import { openPack, type UpdateResult } from './core/openPack'
import { composeSession, type SessionItem } from './core/session'
import type { LogEvent, Pack } from './core/types'
import { addEvents, allEvents, getMeta, instanceId, packStore, setMeta } from './store'

const OFFICIAL_PACK = 'packs/rust/pack.json'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type NewEvent = DistributiveOmit<LogEvent, 'id' | 'instanceId' | 'at' | 'tzOffsetMin'>

export const app = $state({
  pack: undefined as Pack | undefined,
  events: [] as LogEvent[],
  error: '',
  packUpdate: undefined as UpdateResult | undefined,
  persisted: undefined as boolean | undefined,
  session: undefined as { id: string; items: SessionItem[]; index: number } | undefined,
})

let instance = ''

export async function boot() {
  try {
    const [opened, events, id] = await Promise.all([
      openPack(OFFICIAL_PACK, { fetchFn: (...a) => fetch(...a), store: packStore }),
      allEvents(),
      instanceId(),
    ])
    ;[app.pack, app.events, instance] = [opened.pack, events, id]
    app.persisted = await getMeta<boolean>('persisted')
    opened.update.then((r) => (app.packUpdate = r))
  } catch (e) {
    app.error = String(e)
  }
}

export async function record(e: NewEvent) {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a timestamp, never reactive state
  const now = new Date()
  const full = {
    ...e,
    id: crypto.randomUUID(),
    instanceId: instance,
    at: now.getTime(),
    tzOffsetMin: now.getTimezoneOffset(),
  } as LogEvent
  await addEvents([full])
  app.events.push(full)
}

export function startSession() {
  if (!app.pack) return
  const items = composeSession(app.pack, $state.snapshot(app.events) as LogEvent[], Date.now())
  if (items.length) app.session = { id: crypto.randomUUID(), items, index: 0 }
}

export async function nextExercise() {
  const s = app.session
  if (!s) return
  if (s.index + 1 < s.items.length) s.index++
  else app.session = undefined
}

/** Record an attempt; answering the last Exercise completes the Session, even if the Learner leaves right after. */
export async function recordAttempt(e: Extract<NewEvent, { type: 'attempt' }>) {
  await record(e)
  const s = app.session
  if (s && s.index === s.items.length - 1) {
    await record({ type: 'session-completed', sessionId: s.id })
    void askToPersist()
  }
}

/** After a completed Session there is something worth keeping: ask the browser not to evict it. */
async function askToPersist() {
  if (app.persisted || !navigator.storage?.persist) return
  app.persisted = await navigator.storage.persist()
  await setMeta('persisted', app.persisted)
}

export async function importEvents(events: LogEvent[]): Promise<number> {
  const added = await addEvents(events)
  app.events = await allEvents()
  return added
}
