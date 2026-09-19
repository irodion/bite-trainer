import { expect, test } from 'vitest'
import { completedToday, composeSession, SESSION_BUDGET_S, summarize, unfinishedSession } from './session'
import type { Exercise, LogEvent, Pack } from './types'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOON = 20_000 * DAY + 12 * HOUR // some day, 12:00 UTC

const exercise = (id: string, timeBudget = 60): Exercise => ({
  id,
  type: 'choice',
  flavor: 'predict-output',
  timeBudget,
  prompt: '?',
  code: ['fn main() {}'],
  options: [{ id: 'a', correct: true, rationale: '' }],
})

/** 20 one-minute Exercises in one Topic: more than one Session can hold. */
const pack: Pack = {
  source: 'x',
  manifest: {
    formatVersion: 1,
    id: 'p',
    version: '1',
    title: 'P',
    description: '',
    language: { id: 'rust', name: 'Rust', highlight: 'rust' },
    license: 'MIT',
    flavors: {},
    topics: [],
  },
  topics: [{ id: 'basics', title: 'Basics', exercises: Array.from({ length: 20 }, (_, i) => exercise(`ex${i + 1}`)) }],
}

let n = 0
const attempt = (sessionId: string, exerciseId: string, at: number, over: Partial<LogEvent> = {}): LogEvent =>
  ({
    type: 'attempt',
    id: `e${n++}`,
    instanceId: 'i',
    at,
    tzOffsetMin: 0,
    sessionId,
    packId: 'p',
    packVersion: '1',
    exerciseId,
    answer: { optionId: 'a' },
    correct: true,
    elapsedMs: 30_000,
    timeBudget: 60,
    ...over,
  }) as LogEvent
const completed = (sessionId: string, at: number): LogEvent => ({
  type: 'session-completed',
  id: `c${n++}`,
  instanceId: 'i',
  at,
  tzOffsetMin: 0,
  sessionId,
})

test('a Session left halfway is still unfinished later the same day', () => {
  const events = [attempt('s1', 'ex1', NOON), attempt('s1', 'ex2', NOON + 60_000)]
  expect(unfinishedSession(events, NOON + 3 * HOUR, 0)).toEqual({ id: 's1', answered: 2, spentBudget: 120 })
})

test('a completed Session is not unfinished', () => {
  const events = [attempt('s1', 'ex1', NOON), completed('s1', NOON + 1)]
  expect(unfinishedSession(events, NOON + HOUR, 0)).toBeUndefined()
})

test('a Session abandoned yesterday is not offered again: today starts fresh', () => {
  const events = [attempt('s1', 'ex1', NOON)]
  expect(unfinishedSession(events, NOON + DAY, 0)).toBeUndefined()
})

test('"today" is the Learner\'s local day, not the UTC day', () => {
  // 23:30 local in UTC+2 is 21:30 UTC; one hour later it is 00:30 local — a new local day, though the same UTC day.
  const lateEvening = 20_000 * DAY + 21 * HOUR + 30 * 60_000
  const events = [attempt('s1', 'ex1', lateEvening, { tzOffsetMin: -120 })]
  expect(unfinishedSession(events, lateEvening + HOUR, -120)).toBeUndefined()
  expect(unfinishedSession(events, lateEvening + 10 * 60_000, -120)?.id).toBe('s1')
})

test("an erased Pack's half-done Session is gone too", () => {
  const events: LogEvent[] = [
    attempt('s1', 'ex1', NOON),
    { type: 'reset', id: 'r', instanceId: 'i', at: NOON + 1, tzOffsetMin: 0, packId: 'p' },
  ]
  expect(unfinishedSession(events, NOON + HOUR, 0)).toBeUndefined()
})

test('continuing a Session offers only what is left of its Time Budget, and never an Exercise already answered in it', () => {
  const events = [attempt('s1', 'ex1', NOON), attempt('s1', 'ex2', NOON + 60_000), attempt('s1', 'ex3', NOON + 120_000)]
  const fresh = composeSession(pack, [], NOON)
  const rest = composeSession(pack, events, NOON + HOUR, unfinishedSession(events, NOON + HOUR, 0))

  expect(fresh.length).toBe(SESSION_BUDGET_S / 60)
  expect(rest.length).toBe(fresh.length - 3)
  expect(rest[0].exercise.id).toBe('ex4')
})

test('the end-of-Session summary counts answers, overtime and time, and names what was missed', () => {
  const events = [
    attempt('s0', 'ex9', NOON - DAY, { correct: false }), // another Session: not counted
    attempt('s1', 'ex1', NOON, { elapsedMs: 30_000 }),
    attempt('s1', 'ex2', NOON + 60_000, { elapsedMs: 95_000 }), // correct, 35 s over its 60 s budget
    attempt('s1', 'ex3', NOON + 120_000, { correct: false, elapsedMs: 20_000 }),
    completed('s1', NOON + 120_001),
  ]
  expect(summarize(events, 's1', pack)).toEqual({
    answered: 3,
    correct: 2,
    overtime: 1,
    elapsedMs: 145_000,
    missed: [{ exerciseId: 'ex3', topic: 'Basics', prompt: '?' }],
  })
})

test('today counts as done once a Session was completed on this local day', () => {
  const events = [attempt('s1', 'ex1', NOON), completed('s1', NOON + 1)]
  expect(completedToday(events, NOON + 5 * HOUR, 0)).toBe(true)
  expect(completedToday(events, NOON + DAY, 0)).toBe(false)
  expect(completedToday([attempt('s1', 'ex1', NOON)], NOON + HOUR, 0)).toBe(false)
})
