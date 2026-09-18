import { expect, test } from 'vitest'
import { schedule } from './schedule'
import { streak } from './session'
import type { LogEvent } from './types'

const DAY = 86_400_000
let n = 0
const attempt = (at: number, correct: boolean, elapsedMs = 1000): LogEvent => ({
  type: 'attempt',
  id: `e${n++}`,
  instanceId: 'i',
  at,
  tzOffsetMin: 0,
  sessionId: 's',
  packId: 'p',
  packVersion: '1',
  exerciseId: 'x',
  answer: { optionId: 'a' },
  correct,
  elapsedMs,
  timeBudget: 60,
})

test('first correct lands in box 1, then promotes; overtime stays; wrong resets', () => {
  const box = (ev: LogEvent[]) => schedule(ev, 'p').get('x')!.box
  expect(box([attempt(0, true)])).toBe(1)
  expect(box([attempt(0, true), attempt(DAY, true)])).toBe(2)
  expect(box([attempt(0, true), attempt(DAY, true), attempt(3 * DAY, true, 90_000)])).toBe(2)
  expect(box([attempt(0, true), attempt(DAY, true), attempt(3 * DAY, false)])).toBe(1)
})

test('reset hides earlier attempts', () => {
  const ev: LogEvent[] = [
    attempt(0, true),
    { type: 'reset', id: 'r', instanceId: 'i', at: 5, tzOffsetMin: 0, packId: 'p' },
  ]
  expect(schedule(ev, 'p').size).toBe(0)
})

test('streak counts consecutive local days, tolerating today not done yet', () => {
  const done = (at: number): LogEvent => ({
    type: 'session-completed',
    id: `d${at}`,
    instanceId: 'i',
    at,
    tzOffsetMin: 0,
    sessionId: 's',
  })
  expect(streak([done(DAY * 10), done(DAY * 11)], DAY * 12 + 5, 0)).toBe(2)
  expect(streak([done(DAY * 10)], DAY * 12 + 5, 0)).toBe(0)
})
