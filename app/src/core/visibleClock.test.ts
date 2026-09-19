import { expect, test } from 'vitest'
import { VisibleClock } from './visibleClock.ts'

const S = 1000
/** A clock started visible at t=0, ticked every 500 ms up to `until`, as a running page would. */
function ticking(clock: VisibleClock, from: number, until: number) {
  for (let t = from + 500; t <= until; t += 500) clock.tick(t)
}

test('time the Learner spends looking at the Exercise is counted exactly, not rounded to the last tick', () => {
  const clock = new VisibleClock(0, true)
  ticking(clock, 0, 7 * S)
  expect(clock.read(7 * S + 320)).toBe(7 * S + 320)
})

test('time with the app in the background is not counted', () => {
  const clock = new VisibleClock(0, true)
  ticking(clock, 0, 10 * S)
  clock.hide(10 * S)
  clock.show(130 * S) // two minutes away
  ticking(clock, 130 * S, 135 * S)
  expect(clock.read(135 * S)).toBe(15 * S)
})

test('the review case: the browser suspends timers while hidden, then the first tick after returning sees a huge gap', () => {
  const clock = new VisibleClock(0, true)
  ticking(clock, 0, 10 * S)
  clock.hide(10 * S + 100)
  // no ticks for two minutes: suspended
  clock.show(130 * S)
  clock.tick(130 * S + 400)
  expect(clock.read(131 * S)).toBe(10 * S + 100 + 1 * S)
})

test('a suspension the browser never announced (lid closed, tab in front) is not counted either', () => {
  const clock = new VisibleClock(0, true)
  ticking(clock, 0, 10 * S)
  // no hide(), no show(), no ticks for two minutes
  clock.tick(130 * S)
  ticking(clock, 130 * S, 133 * S)
  expect(clock.read(133 * S)).toBe(13 * S)
})

test('reading right after an unannounced suspension does not count it', () => {
  const clock = new VisibleClock(0, true)
  ticking(clock, 0, 10 * S)
  expect(clock.read(130 * S)).toBe(10 * S)
})

test('a slow but living page still counts: a 1.5 s stall between ticks is real reading time', () => {
  const clock = new VisibleClock(0, true)
  clock.tick(500)
  clock.tick(2000)
  expect(clock.read(2000)).toBe(2000)
})

test('an Exercise opened while the page is hidden starts counting only once it is shown', () => {
  const clock = new VisibleClock(0, false)
  clock.tick(500)
  clock.show(5 * S)
  ticking(clock, 5 * S, 8 * S)
  expect(clock.read(8 * S)).toBe(3 * S)
})

test('repeated hide or show signals do not double count', () => {
  const clock = new VisibleClock(0, true)
  clock.tick(500)
  clock.show(600)
  clock.tick(1000)
  clock.hide(1200)
  clock.hide(1300)
  expect(clock.read(9 * S)).toBe(1200)
})
