import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { validatePack } from './validate'

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../public/packs/rust/${p}`, import.meta.url), 'utf8'))
const manifest = read('pack.json')
const topics = manifest.topics.map((t: { file: string }) => read(t.file))

test('the official Rust Pack has no problems', () => {
  expect(validatePack(manifest, topics)).toEqual([])
})

test('a Choice Exercise with two correct options is a problem naming the Exercise', () => {
  const broken = structuredClone(topics)
  const ex = broken[0].exercises.find((e: { type: string }) => e.type === 'choice')
  ex.options[0].correct = true
  ex.options[1].correct = true
  expect(validatePack(manifest, broken)).toEqual([`${ex.id}: exactly one option must be correct (found 2)`])
})

test('a Line-Select answer outside the snippet is a problem', () => {
  const broken = structuredClone(topics)
  const ex = broken
    .flatMap((t: { exercises: { type: string }[] }) => t.exercises)
    .find((e: { type: string }) => e.type === 'line-select')
  ex.correctLines = [ex.code.length + 1]
  expect(validatePack(manifest, broken)).toEqual([
    `${ex.id}: correct line ${ex.code.length + 1} is outside the snippet`,
  ])
})

test('a manifest the app cannot use is a problem, not a crash', () => {
  expect(validatePack({ formatVersion: 2 }, [])).toContain('pack.json: unsupported formatVersion 2')
  expect(validatePack('nope', [])).toEqual(['pack.json: not a JSON object'])
  expect(validatePack({ ...manifest, id: '' }, topics)).toContain('pack.json: missing id')
})

test('an Exercise without code or a Time Budget is a problem', () => {
  const broken = structuredClone(topics)
  const ex = broken[0].exercises[0]
  delete ex.timeBudget
  ex.code = 'fn main() {}'
  expect(validatePack(manifest, broken)).toEqual([
    `${ex.id}: code must be an array of lines`,
    `${ex.id}: timeBudget must be a positive number`,
  ])
})
