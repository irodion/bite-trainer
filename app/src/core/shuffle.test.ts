import { expect, test } from 'vitest'
import { shuffled } from './shuffle'

/** Deterministic stand-in for Math.random. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const options = ['correct', 'wrong-1', 'wrong-2', 'wrong-3']

test('the correct option does not stay in first place: over many presentations it lands in every position about equally', () => {
  const firstPlace = [0, 0, 0, 0]
  const random = seeded(7)
  for (let i = 0; i < 4000; i++) firstPlace[shuffled(options, random).indexOf('correct')]++
  for (const n of firstPlace) expect(n).toBeGreaterThan(850) // fair share is 1000
})

test('shuffling keeps every option exactly once and leaves the authored order untouched', () => {
  const result = shuffled(options, seeded(1))
  expect([...result].sort()).toEqual([...options].sort())
  expect(options).toEqual(['correct', 'wrong-1', 'wrong-2', 'wrong-3'])
})
