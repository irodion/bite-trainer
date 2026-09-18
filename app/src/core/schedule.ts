import type { AttemptEvent, LogEvent } from './types'

const DAY = 24 * 60 * 60 * 1000
/** Days until an Exercise in box N (1-based) is due again. */
export const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16]

export interface ExerciseState {
  box: number
  dueAt: number
  attempts: number
  lastCorrect: boolean
}

export function byTime(a: LogEvent, b: LogEvent): number {
  return a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/** Attempts for one Pack that survive its latest `reset`, oldest first. */
export function liveAttempts(events: LogEvent[], packId: string): AttemptEvent[] {
  let resetAt = -Infinity
  for (const e of events) if (e.type === 'reset' && e.packId === packId) resetAt = Math.max(resetAt, e.at)
  return events
    .filter((e): e is AttemptEvent => e.type === 'attempt' && e.packId === packId && e.at > resetAt)
    .sort(byTime)
}

/** Leitner fold: wrong → box 1; correct but overtime → stay; correct in time → promote. */
export function schedule(events: LogEvent[], packId: string): Map<string, ExerciseState> {
  const states = new Map<string, ExerciseState>()
  for (const e of liveAttempts(events, packId)) {
    const prev = states.get(e.exerciseId)
    let box = prev?.box ?? 1
    if (!e.correct) box = 1
    else if (e.elapsedMs <= e.timeBudget * 1000 && prev) box = Math.min(box + 1, BOX_INTERVAL_DAYS.length)
    states.set(e.exerciseId, {
      box,
      dueAt: e.at + BOX_INTERVAL_DAYS[box - 1] * DAY,
      attempts: (prev?.attempts ?? 0) + 1,
      lastCorrect: e.correct,
    })
  }
  return states
}
