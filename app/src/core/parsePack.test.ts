import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parsePack } from './parsePack'
import { validatePack } from './validate'

const read = (p: string) => JSON.parse(readFileSync(new URL(`../../public/packs/rust/${p}`, import.meta.url), 'utf8'))
const manifest = read('pack.json')
const fresh = (): any[] => manifest.topics.map((t: { file: string }) => read(t.file))
const firstChoice = (topics: any[]) => topics[0].exercises.find((e: any) => e.type === 'choice')
const firstLineSelect = (topics: any[]) => topics.flatMap((t) => t.exercises).find((e: any) => e.type === 'line-select')

/** Break one thing in the shipped Pack and return the problems reported. */
function problemsAfter(edit: (topics: any[], m: any) => void): string[] {
  const topics = fresh()
  const m = structuredClone(manifest)
  edit(topics, m)
  return validatePack(m, topics)
}

test('the shipped Pack parses into typed data, keeping only known fields', () => {
  const topics = fresh()
  topics[0].exercises[0].madeUpField = 'ignored'
  const parsed = parsePack(manifest, topics)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(parsed.manifest.id).toBe(manifest.id)
  expect(parsed.topics.map((t) => t.id)).toEqual(manifest.topics.map((t: { id: string }) => t.id))
  expect(parsed.topics[0].exercises[0]).not.toHaveProperty('madeUpField')
  expect(parsed.topics[0].exercises[0].verify).toEqual(fresh()[0].exercises[0].verify)
})

test('an option that is not an object is a problem — it is never silently skipped', () => {
  const id = firstChoice(fresh()).id
  expect(problemsAfter((t) => firstChoice(t).options.push(null))).toEqual([`${id}: option 5 is not an object`])
})

test('every field the Exercise screen renders must be present and of the right kind', () => {
  const c = firstChoice(fresh()).id
  const l = firstLineSelect(fresh()).id
  expect(problemsAfter((t) => delete firstChoice(t).options[0].rationale)).toEqual([
    `${c}: option a is missing rationale`,
  ])
  expect(problemsAfter((t) => delete firstChoice(t).options[1].text)).toEqual([
    `${c}: option b needs either text or code`,
  ])
  expect(problemsAfter((t) => (firstChoice(t).options[1].code = 'x'))).toEqual([
    `${c}: option b needs either text or code`,
  ])
  expect(problemsAfter((t) => (firstChoice(t).focus = 'x'))).toEqual([
    `${c}: focus must be [from, to] inside the snippet`,
  ])
  expect(problemsAfter((t) => delete firstChoice(t).flavor)).toEqual([`${c}: missing flavor`])
  expect(problemsAfter((t) => (firstChoice(t).flavor = 'riddle'))).toEqual([
    `${c}: flavor "riddle" is not declared in pack.json`,
  ])
  expect(
    problemsAfter((t) => ((firstLineSelect(t).rationale = 7), delete firstLineSelect(t).fallbackRationale)),
  ).toEqual([`${l}: missing rationale`, `${l}: missing fallbackRationale`])
  expect(problemsAfter((t) => (firstLineSelect(t).lineRationales = { 999: 'x' }))).toEqual([
    `${l}: lineRationales key "999" is not a line of the snippet`,
  ])
})

test('Topic and manifest fields the app renders are checked too', () => {
  expect(problemsAfter((t) => (t[0].title = 42))).toEqual([`${manifest.topics[0].id}: missing title`])
  expect(problemsAfter((t) => (t[0].primer = { title: 'x', body: 'not-an-array' }))).toEqual([
    `${manifest.topics[0].id}: primer body must be a list of text blocks`,
  ])
  expect(problemsAfter((_, m) => delete m.flavors)).toContain('pack.json: missing flavors')
  expect(problemsAfter((_, m) => (m.language = { highlight: 'rust' }))).toEqual([
    'pack.json: missing language.id',
    'pack.json: missing language.name',
  ])
})

test("ids are unique across the whole Pack, and within an Exercise's options", () => {
  const c = firstChoice(fresh()).id
  expect(problemsAfter((t) => (t[1].exercises[0].id = t[0].exercises[0].id))).toEqual([
    `${fresh()[0].exercises[0].id}: this Exercise id is used more than once in the Pack`,
  ])
  expect(problemsAfter((t) => (firstChoice(t).options[1].id = 'a'))).toEqual([
    `${c}: option id "a" is used more than once`,
  ])
})

test('the Topic files must be exactly the ones pack.json lists', () => {
  expect(validatePack(manifest, fresh().slice(1))).toEqual([
    `pack.json lists ${manifest.topics.length} Topics but ${manifest.topics.length - 1} Topic files were loaded`,
  ])
  expect(problemsAfter((t) => (t[0].id = 'renamed'))).toEqual([
    `${manifest.topics[0].file}: Topic id "renamed" does not match pack.json ("${manifest.topics[0].id}")`,
  ])
})
