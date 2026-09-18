import { schedule, type ExerciseState } from './schedule'
import type { Exercise, LogEvent, Pack, Topic } from './types'

export interface SessionItem {
  topic: Topic
  exercise: Exercise
  kind: 'new' | 'review'
}

/** Seconds of Time Budget a Session aims for (~10–15 min once reading Explanations is included). */
export const SESSION_BUDGET_S = 8 * 60

/** Due reviews first (oldest due first), then new Exercises in Topic path order, until the budget is filled. */
export function composeSession(pack: Pack, events: LogEvent[], now: number): SessionItem[] {
  const states = schedule(events, pack.manifest.id)
  const all = pack.topics.flatMap((topic) => topic.exercises.map((exercise) => ({ topic, exercise })))
  const due = all
    .filter(({ exercise }) => (states.get(exercise.id)?.dueAt ?? Infinity) <= now)
    .sort((a, b) => states.get(a.exercise.id)!.dueAt - states.get(b.exercise.id)!.dueAt)
    .map((x) => ({ ...x, kind: 'review' as const }))
  const fresh = all.filter(({ exercise }) => !states.has(exercise.id)).map((x) => ({ ...x, kind: 'new' as const }))

  const items: SessionItem[] = []
  let budget = 0
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
