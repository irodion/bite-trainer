import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseManifest, parseTopics } from '../../src/core/parsePack.ts'
import type { Exercise } from '../../src/core/types.ts'
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
  const m = parseManifest(await readJson(manifestPath))
  if (!m.ok) return { exercises: 0, problems: m.problems }
  const files = await Promise.all(m.manifest.topics.map((t) => readJson(join(dirname(manifestPath), t.file))))
  const t = parseTopics(m.manifest, files)
  if (!t.ok) return { exercises: 0, problems: t.problems }
  const exercises = t.topics.flatMap((topic) => topic.exercises)

  const problems = exercises.flatMap(limitProblems)
  // Compile a few at a time: rustc is CPU-bound and a Pack has hundreds of snippets.
  for (let i = 0; i < exercises.length; i += 4) {
    const batch = await Promise.all(exercises.slice(i, i + 4).map((ex) => verifyExercise(ex, toolchain)))
    problems.push(...batch.flat())
  }
  return { exercises: exercises.length, problems }
}

const POSITIONAL = /\b(?:all|none|both) of the above\b|\boptions? [A-H]\b|\b(?:previous|next|first|last) option\b/i

function limitProblems(ex: Exercise): string[] {
  const out: string[] = []
  if (ex.type === 'choice') {
    for (const o of ex.options) {
      const hit = POSITIONAL.exec(`${o.text ?? ''}\n${o.rationale}`)
      if (hit)
        out.push(`${ex.id}: option ${o.id} refers to other options by position ("${hit[0]}") — options are shuffled`)
    }
  }
  if (ex.code.length > MAX_LINES) out.push(`${ex.id}: snippet is ${ex.code.length} lines long (limit ${MAX_LINES})`)
  ex.code.forEach((l, i) => {
    if (l.length > MAX_COLUMNS) out.push(`${ex.id}: line ${i + 1} is ${l.length} columns wide (limit ${MAX_COLUMNS})`)
  })
  return out
}
