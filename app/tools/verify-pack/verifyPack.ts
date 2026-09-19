import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Exercise, PackManifest, Topic } from '../../src/core/types.ts'
import { validatePack } from '../../src/core/validate.ts'
import { verifyExercise, type Toolchain } from './verifyExercise.ts'

/** Hard authoring limits from the Exercise screen prototype: what fits a phone without wrapping. */
export const MAX_LINES = 30
export const MAX_COLUMNS = 60

export interface Report {
  exercises: number
  problems: string[]
}

const readJson = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as unknown

/** Author-time check of a Pack on disk: structure, authoring limits, then every Exercise's claim against the toolchain. */
export async function verifyPack(manifestPath: string, toolchain: Toolchain): Promise<Report> {
  const manifest = (await readJson(manifestPath)) as PackManifest
  const files = Array.isArray(manifest?.topics) ? manifest.topics : []
  const topics = (await Promise.all(files.map((t) => readJson(join(dirname(manifestPath), t.file))))) as Topic[]

  const structural = validatePack(manifest, topics)
  const exercises = structural.length ? [] : topics.flatMap((t) => t.exercises)
  if (structural.length) return { exercises: 0, problems: structural }

  const problems = exercises.flatMap(limitProblems)
  // Compile a few at a time: rustc is CPU-bound and a Pack has hundreds of snippets.
  for (let i = 0; i < exercises.length; i += 4) {
    const batch = await Promise.all(exercises.slice(i, i + 4).map((ex) => verifyExercise(ex, toolchain)))
    problems.push(...batch.flat())
  }
  return { exercises: exercises.length, problems }
}

function limitProblems(ex: Exercise): string[] {
  const out: string[] = []
  if (ex.code.length > MAX_LINES) out.push(`${ex.id}: snippet is ${ex.code.length} lines long (limit ${MAX_LINES})`)
  ex.code.forEach((l, i) => {
    if (l.length > MAX_COLUMNS) out.push(`${ex.id}: line ${i + 1} is ${l.length} columns wide (limit ${MAX_COLUMNS})`)
  })
  return out
}
