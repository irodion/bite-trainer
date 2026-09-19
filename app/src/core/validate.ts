import { parsePack } from './parsePack.ts'

/** The problems a fetched Pack has, in Learner-readable form; empty means it parses. See `parsePack` for the data. */
export function validatePack(manifest: unknown, topics: unknown[]): string[] {
  const parsed = parsePack(manifest, topics)
  return parsed.ok ? [] : parsed.problems
}
