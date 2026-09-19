import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import type { Toolchain } from './verifyExercise.ts'
import { verifyPack } from './verifyPack.ts'

async function packOnDisk(exercise: object): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pack-'))
  await mkdir(join(dir, 'topics'))
  const manifest = {
    formatVersion: 1,
    id: 'test.pack',
    version: '1',
    title: 'T',
    language: { id: 'rust', name: 'Rust', highlight: 'rust' },
    flavors: {},
    topics: [{ id: 'basics', title: 'Basics', file: 'topics/basics.json' }],
  }
  await writeFile(join(dir, 'pack.json'), JSON.stringify(manifest))
  await writeFile(
    join(dir, 'topics/basics.json'),
    JSON.stringify({ id: 'basics', title: 'Basics', exercises: [exercise] }),
  )
  return join(dir, 'pack.json')
}

const exercise = {
  id: 'adds',
  type: 'choice',
  flavor: 'predict-output',
  timeBudget: 30,
  prompt: 'Prints?',
  code: ['fn main() { println!("{}", 1 + 1); }'],
  verify: { stdout: '2' },
  options: [{ id: 'a', text: '`2`', correct: true, rationale: '' }],
}
const prints = (stdout: string): Toolchain & { runs: number } => ({
  runs: 0,
  async run() {
    this.runs++
    return { compiled: true, stdout, errors: [] }
  },
})

test('a Pack whose every claim holds has no problems', async () => {
  const rustc = prints('2\n')
  expect(await verifyPack(await packOnDisk(exercise), rustc)).toEqual({ exercises: 1, problems: [] })
  expect(rustc.runs).toBe(1)
})

test('a false claim anywhere in the Pack is a problem', async () => {
  expect((await verifyPack(await packOnDisk(exercise), prints('3\n'))).problems).toEqual([
    'adds: claims stdout "2" but the program printed "3"',
  ])
})

test('a structurally broken Pack is reported without ever running the compiler', async () => {
  const rustc = prints('2\n')
  const report = await verifyPack(await packOnDisk({ ...exercise, timeBudget: 0 }), rustc)
  expect(report.problems).toEqual(['adds: timeBudget must be a positive number'])
  expect(rustc.runs).toBe(0)
})

test('authoring limits: a snippet over 30 lines or 60 columns is a problem', async () => {
  const wide = { ...exercise, code: ['fn main() { println!("{}", 1 + 1); }' + ' '.repeat(30) + '// way too wide'] }
  expect((await verifyPack(await packOnDisk(wide), prints('2\n'))).problems).toEqual([
    'adds: line 1 is 81 columns wide (limit 60)',
  ])
})
