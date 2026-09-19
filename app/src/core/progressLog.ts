// The ONE boundary where untrusted Progress Log data — an imported file, or records read back from storage —
// becomes typed events. Folds only ever see what passed through here.
import type { AttemptEvent, LogEvent, ResetEvent, SessionCompletedEvent } from './types.ts'

type Json = Record<string, unknown>

/** An event of a type this build does not know (written by a newer app). Kept and re-exported; never folded. */
export interface UnknownEvent {
  id: string
  type: string
  at: number
  instanceId: string
  tzOffsetMin: number
  [field: string]: unknown
}

export interface ExportFile {
  format: 'bite-trainer-progress'
  formatVersion: 1
  exportedAt: number
  events: (LogEvent | UnknownEvent)[]
}

export type ParsedLog = { ok: true; events: LogEvent[]; unknown: UnknownEvent[] } | { ok: false; problems: string[] }

/** Clock skew and time zones are tolerated; a file claiming events from further ahead than this is refused. */
export const MAX_FUTURE_MS = 48 * 3_600_000
const MAX_PROBLEMS = 5

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isInt = (v: unknown): v is number => Number.isSafeInteger(v)
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

type ParsedEvent =
  { kind: 'known'; event: LogEvent } | { kind: 'unknown'; event: UnknownEvent } | { kind: 'invalid'; problem: string }

/** One event. Known types are checked field by field; extra fields a newer app may have added are carried along. */
export function parseEvent(json: unknown): ParsedEvent {
  const bad = (problem: string): ParsedEvent => ({ kind: 'invalid', problem })
  if (!isObj(json)) return bad('not an object')
  if (!isText(json.id)) return bad('missing id')
  if (!isText(json.type)) return bad('missing type')
  if (!isInt(json.at) || json.at < 0) return bad('at must be a whole number of milliseconds')
  if (!isInt(json.tzOffsetMin) || Math.abs(json.tzOffsetMin) > 24 * 60)
    return bad('tzOffsetMin must be a whole number of minutes')
  if (!isText(json.instanceId)) return bad('missing instanceId')
  const envelope = { id: json.id, instanceId: json.instanceId, at: json.at, tzOffsetMin: json.tzOffsetMin }

  if (json.type === 'attempt') {
    for (const field of ['sessionId', 'packId', 'packVersion', 'exerciseId'] as const)
      if (!isText(json[field])) return bad(`missing ${field}`)
    const a = json.answer
    const answer =
      isObj(a) && isText(a.optionId)
        ? { optionId: a.optionId }
        : isObj(a) && isInt(a.line) && a.line >= 1
          ? { line: a.line }
          : undefined
    if (!answer) return bad('answer must be { optionId } or { line }')
    if (typeof json.correct !== 'boolean') return bad('correct must be true or false')
    if (!isAmount(json.elapsedMs)) return bad('elapsedMs must be a non-negative number')
    if (!isAmount(json.timeBudget) || json.timeBudget === 0) return bad('timeBudget must be a positive number')
    const event: AttemptEvent = {
      ...json,
      ...envelope,
      type: 'attempt',
      sessionId: json.sessionId as string,
      packId: json.packId as string,
      packVersion: json.packVersion as string,
      exerciseId: json.exerciseId as string,
      answer,
      correct: json.correct,
      elapsedMs: json.elapsedMs,
      timeBudget: json.timeBudget,
    }
    return { kind: 'known', event }
  }
  if (json.type === 'session-completed') {
    if (!isText(json.sessionId)) return bad('missing sessionId')
    const event: SessionCompletedEvent = { ...json, ...envelope, type: 'session-completed', sessionId: json.sessionId }
    return { kind: 'known', event }
  }
  if (json.type === 'reset') {
    if (!isText(json.packId)) return bad('missing packId')
    const event: ResetEvent = { ...json, ...envelope, type: 'reset', packId: json.packId }
    return { kind: 'known', event }
  }
  return { kind: 'unknown', event: { ...json, ...envelope, type: json.type } }
}

/** An import file. All or nothing: any problem refuses the whole file, so nothing is ever half-imported. */
export function parseProgressLog(json: unknown, now: number): ParsedLog {
  if (!isObj(json) || json.format !== 'bite-trainer-progress' || !Array.isArray(json.events)) {
    return { ok: false, problems: ['not a Bite Trainer progress file'] }
  }
  if (json.formatVersion !== 1) {
    return {
      ok: false,
      problems: [`this file was written by a newer app (format ${json.formatVersion}) — update the app to import it`],
    }
  }

  const events: LogEvent[] = []
  const unknown: UnknownEvent[] = []
  const problems: string[] = []
  json.events.forEach((raw, i) => {
    const parsed = parseEvent(raw)
    const label = `event ${i + 1}${isObj(raw) && isText(raw.id) ? ` (${raw.id})` : ''}`
    if (parsed.kind === 'invalid') problems.push(`${label}: ${parsed.problem}`)
    else if (parsed.event.at > now + MAX_FUTURE_MS) problems.push(`${label}: is dated more than 48 hours in the future`)
    else if (parsed.kind === 'known') events.push(parsed.event)
    else unknown.push(parsed.event)
  })

  if (problems.length > MAX_PROBLEMS)
    problems.splice(MAX_PROBLEMS, Infinity, `…and ${problems.length - MAX_PROBLEMS} more`)
  return problems.length ? { ok: false, problems } : { ok: true, events, unknown }
}

/** The export file: the whole log, unknown events included, in the order given. */
export function serializeProgressLog(events: LogEvent[], unknown: UnknownEvent[], exportedAt: number): ExportFile {
  return { format: 'bite-trainer-progress', formatVersion: 1, exportedAt, events: [...events, ...unknown] }
}

/**
 * Records read back from storage. One that does not parse is set aside — left where it is (the log is append-only)
 * but kept out of the folds and out of exports. No future-date rule here: this device wrote these itself, and a
 * wrong clock must not cost the Learner their history.
 */
export function readStored(records: unknown[]): { events: LogEvent[]; unknown: UnknownEvent[]; quarantined: number } {
  const events: LogEvent[] = []
  const unknown: UnknownEvent[] = []
  let quarantined = 0
  for (const record of records) {
    const parsed = parseEvent(record)
    if (parsed.kind === 'known') events.push(parsed.event)
    else if (parsed.kind === 'unknown') unknown.push(parsed.event)
    else quarantined++
  }
  return { events, unknown, quarantined }
}
