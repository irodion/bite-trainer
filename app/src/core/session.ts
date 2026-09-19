import { byTime, schedule, survivingAttempts, type ExerciseState } from './schedule'
import type { AttemptEvent, Exercise, LogEvent, NewAttempt, NewEvent, Pack, Topic } from './types'

export interface SessionItem {
  topic: Topic
  exercise: Exercise
  kind: 'new' | 'review'
}

/** Seconds of Time Budget a Session aims for (~10–15 min once reading Explanations is included). */
export const SESSION_BUDGET_S = 8 * 60

/**
 * Due reviews first (oldest due first), then new Exercises in Topic path order, until the budget is filled.
 * When continuing a Session, the budget its answered Exercises already used is not offered again.
 */
export function composeSession(
  pack: Pack,
  events: LogEvent[],
  now: number,
  resume?: { spentBudget: number },
): SessionItem[] {
  const states = schedule(events, pack.manifest.id)
  const all = pack.topics.flatMap((topic) => topic.exercises.map((exercise) => ({ topic, exercise })))
  const due = all
    .filter(({ exercise }) => (states.get(exercise.id)?.dueAt ?? Infinity) <= now)
    .sort((a, b) => states.get(a.exercise.id)!.dueAt - states.get(b.exercise.id)!.dueAt)
    .map((x) => ({ ...x, kind: 'review' as const }))
  const fresh = all.filter(({ exercise }) => !states.has(exercise.id)).map((x) => ({ ...x, kind: 'new' as const }))

  const items: SessionItem[] = []
  let budget = resume?.spentBudget ?? 0
  for (const item of [...due, ...fresh]) {
    if (budget >= SESSION_BUDGET_S) break
    items.push(item)
    budget += item.exercise.timeBudget
  }
  return items
}

/** Per-Topic Mastery 0..1: mean Leitner box of the Topic's Exercises, unseen counting as 0. */
export function mastery(topic: Topic, states: Map<string, ExerciseState>): number {
  if (topic.exercises.length === 0) return 0
  const sum = topic.exercises.reduce((s, e) => s + (states.get(e.id)?.box ?? 0), 0)
  return sum / (topic.exercises.length * 5)
}

function localDay(at: number, tzOffsetMin: number): number {
  return Math.floor((at - tzOffsetMin * 60_000) / 86_400_000)
}

/** Consecutive local days ending today (or yesterday) with a completed Session. */
export function streak(events: LogEvent[], now: number, tzOffsetMin: number): number {
  const days = new Set(events.filter((e) => e.type === 'session-completed').map((e) => localDay(e.at, e.tzOffsetMin)))
  let day = localDay(now, tzOffsetMin)
  if (!days.has(day)) day--
  let n = 0
  while (days.has(day)) {
    n++
    day--
  }
  return n
}

export interface UnfinishedSession {
  id: string
  answered: number
  /** Seconds of Time Budget already used up by the answered Exercises. */
  spentBudget: number
}

/** The most recent Session, if it was started today (local time) and never completed. Derived from the log alone. */
export function unfinishedSession(events: LogEvent[], now: number, tzOffsetMin: number): UnfinishedSession | undefined {
  const attempts = survivingAttempts(events)

  const last = attempts.at(-1)
  if (!last) return undefined
  if (events.some((e) => e.type === 'session-completed' && e.sessionId === last.sessionId)) return undefined
  if (localDay(last.at, last.tzOffsetMin) !== localDay(now, tzOffsetMin)) return undefined

  const mine = attempts.filter((e) => e.sessionId === last.sessionId)
  return { id: last.sessionId, answered: mine.length, spentBudget: mine.reduce((s, e) => s + e.timeBudget, 0) }
}

export interface SessionSummary {
  answered: number
  correct: number
  /** Answered correctly, but over the Time Budget. */
  overtime: number
  elapsedMs: number
  /** Wrong answers, in the order they happened; an Exercise no longer in the Pack is left out. */
  missed: { exerciseId: string; topic: string; prompt: string }[]
}

export function summarize(events: LogEvent[], sessionId: string, pack: Pack): SessionSummary {
  const attempts = events
    .filter((e): e is AttemptEvent => e.type === 'attempt' && e.sessionId === sessionId)
    .sort(byTime)
  const find = (id: string) => {
    for (const topic of pack.topics) {
      const exercise = topic.exercises.find((e) => e.id === id)
      if (exercise) return { exerciseId: id, topic: topic.title, prompt: exercise.prompt }
    }
  }
  return {
    answered: attempts.length,
    correct: attempts.filter((e) => e.correct).length,
    overtime: attempts.filter((e) => e.correct && e.elapsedMs > e.timeBudget * 1000).length,
    elapsedMs: attempts.reduce((s, e) => s + e.elapsedMs, 0),
    missed: attempts.filter((e) => !e.correct).flatMap((e) => find(e.exerciseId) ?? []),
  }
}

/** Whether the Learner has already completed a Session on the current local day. */
export function completedToday(events: LogEvent[], now: number, tzOffsetMin: number): boolean {
  const today = localDay(now, tzOffsetMin)
  return events.some((e) => e.type === 'session-completed' && localDay(e.at, e.tzOffsetMin) === today)
}

/** The local UTC offset right now, in the sign convention of `Date.getTimezoneOffset` (UTC+2 is -120). */
export function tzOffsetNow(): number {
  return new Date().getTimezoneOffset()
}

/**
 * Everything one answer adds to the Progress Log. Answering a Session's last Exercise completes it, so both events
 * are decided here, together, from the position the Learner was at when they answered — and written as one unit.
 */
export function answerEvents(attempt: NewAttempt, position: { index: number; total: number }): NewEvent[] {
  if (position.index < position.total - 1) return [attempt]
  return [attempt, { type: 'session-completed', sessionId: attempt.sessionId }]
}
