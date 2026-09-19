import { expect, test } from 'vitest'
import { parseProgressLog, readStored, serializeProgressLog } from './progressLog.ts'
import { schedule } from './schedule'
import type { LogEvent } from './types'

const DAY = 86_400_000
const NOW = 20_000 * DAY + 12 * 3_600_000
const stamp = { instanceId: 'inst-1', tzOffsetMin: -120 }

const attempt = (id: string, at: number, over: object = {}) => ({
  ...stamp,
  id,
  type: 'attempt',
  at,
  sessionId: 's1',
  packId: 'p',
  packVersion: '1',
  exerciseId: 'ex1',
  answer: { optionId: 'a' },
  correct: true,
  elapsedMs: 1000,
  timeBudget: 60,
  ...over,
})
const completed = (id: string, at: number) => ({ ...stamp, id, type: 'session-completed', at, sessionId: 's1' })
const reset = (id: string, at: unknown) => ({ ...stamp, id, type: 'reset', at, packId: 'p' })
const file = (events: unknown[], over: object = {}) => ({
  format: 'bite-trainer-progress',
  formatVersion: 1,
  exportedAt: NOW,
  events,
  ...over,
})

const problemsOf = (json: unknown) => {
  const parsed = parseProgressLog(json, NOW)
  return parsed.ok ? [] : parsed.problems
}

test('what is exported can be imported again, unchanged', () => {
  const events = [
    attempt('a1', NOW - 5),
    attempt('a2', NOW - 4, { answer: { line: 7 }, correct: false }),
    completed('c1', NOW - 3),
    reset('r1', NOW - 2),
  ] as LogEvent[]
  const parsed = parseProgressLog(JSON.parse(JSON.stringify(serializeProgressLog(events, [], NOW))), NOW)
  expect(parsed).toEqual({ ok: true, events, unknown: [] })
})

test('a file that is not a progress export is refused', () => {
  expect(problemsOf('nope')).toEqual(['not a Bite Trainer progress file'])
  expect(problemsOf(file([], { format: 'something-else' }))).toEqual(['not a Bite Trainer progress file'])
  expect(problemsOf(file([], { formatVersion: 2 }))).toEqual([
    'this file was written by a newer app (format 2) — update the app to import it',
  ])
  expect(problemsOf({ format: 'bite-trainer-progress', formatVersion: 1, events: 'x' })).toEqual([
    'not a Bite Trainer progress file',
  ])
})

test('the review replay: a reset whose time is not a number is refused, so it can never poison the folds', () => {
  expect(problemsOf(file([attempt('a1', NOW - 9), reset('r1', 'bad')]))).toEqual([
    'event 2 (r1): at must be a whole number of milliseconds',
  ])
  expect(problemsOf(file([reset('r1', '99999999999999')]))).toEqual([
    'event 1 (r1): at must be a whole number of milliseconds',
  ])
})

test('one bad event refuses the whole file — nothing is half-imported', () => {
  const parsed = parseProgressLog(
    file([attempt('a1', NOW - 9), attempt('a2', NOW - 8, { timeBudget: '60' }), completed('c1', NOW - 7)]),
    NOW,
  )
  expect(parsed).toEqual({ ok: false, problems: ['event 2 (a2): timeBudget must be a positive number'] })
})

test('every field the folds compute with must have the right kind', () => {
  const one = (e: unknown) => problemsOf(file([e]))
  expect(one(null)).toEqual(['event 1: not an object'])
  expect(one({ ...attempt('a1', NOW), id: '' })).toEqual(['event 1: missing id'])
  expect(one(attempt('a1', null as unknown as number))).toEqual([
    'event 1 (a1): at must be a whole number of milliseconds',
  ])
  expect(one(attempt('a1', NOW, { tzOffsetMin: 'x' }))).toEqual([
    'event 1 (a1): tzOffsetMin must be a whole number of minutes',
  ])
  expect(one(attempt('a1', NOW, { elapsedMs: 'abc' }))).toEqual([
    'event 1 (a1): elapsedMs must be a non-negative number',
  ])
  expect(one(attempt('a1', NOW, { elapsedMs: Infinity }))).toEqual([
    'event 1 (a1): elapsedMs must be a non-negative number',
  ])
  expect(one(attempt('a1', NOW, { correct: 'yes' }))).toEqual(['event 1 (a1): correct must be true or false'])
  expect(one(attempt('a1', NOW, { answer: { optionId: 5 } }))).toEqual([
    'event 1 (a1): answer must be { optionId } or { line }',
  ])
  expect(one(attempt('a1', NOW, { exerciseId: undefined }))).toEqual(['event 1 (a1): missing exerciseId'])
  expect(one({ ...completed('c1', NOW), sessionId: 9 })).toEqual(['event 1 (c1): missing sessionId'])
  expect(one({ ...reset('r1', NOW), packId: undefined })).toEqual(['event 1 (r1): missing packId'])
})

test('an event type this build does not know is kept for re-export, but never reaches the folds', () => {
  const future = { ...stamp, id: 'n1', type: 'note-added', at: NOW - 1, text: 'from a newer app' }
  const parsed = parseProgressLog(file([attempt('a1', NOW - 2), future]), NOW)
  expect(parsed).toEqual({ ok: true, events: [attempt('a1', NOW - 2)], unknown: [future] })
  if (parsed.ok)
    expect(serializeProgressLog(parsed.events, parsed.unknown, NOW).events).toEqual([attempt('a1', NOW - 2), future])
})

test('an imported file may not contain events from the far future: a well-formed reset dated 2286 would hide all progress', () => {
  expect(problemsOf(file([reset('r1', NOW + 47 * 3_600_000)]))).toEqual([])
  expect(problemsOf(file([reset('r1', NOW + 49 * 3_600_000)]))).toEqual([
    'event 1 (r1): is dated more than 48 hours in the future',
  ])
})

test('a long list of problems is cut short', () => {
  const bad = Array.from({ length: 30 }, (_, i) => attempt(`a${i}`, NOW, { correct: 'x' }))
  const problems = problemsOf(file(bad))
  expect(problems).toHaveLength(6)
  expect(problems[5]).toBe('…and 25 more')
})

test('events already in storage that do not parse are set aside, not deleted and not folded', () => {
  const stored = [
    attempt('a1', NOW - 9),
    reset('r1', 'bad'),
    null,
    { ...stamp, id: 'n1', type: 'note-added', at: NOW - 1 },
  ]
  const read = readStored(stored)
  expect(read.events).toEqual([attempt('a1', NOW - 9)])
  expect(read.unknown).toHaveLength(1)
  expect(read.quarantined).toBe(2)
  expect(schedule(read.events, 'p').size).toBe(1) // the poisoned store of the review replay is usable again
})

test('storage is not subject to the 48-hour rule: a device with a wrong clock keeps its own history', () => {
  expect(readStored([attempt('a1', NOW + 400 * DAY)]).quarantined).toBe(0)
})
