import { parseManifest, parseTopics } from './parsePack.ts'
import type { Pack } from './types'

/** A fetched Pack failed validation; `problems` is Learner-readable. */
export class InvalidPackError extends Error {
  constructor(readonly problems: string[]) {
    super(`This Pack has problems:\n${problems.join('\n')}`)
  }
}

/** Fetch and validate a whole Pack (manifest + every Topic file) from its Pack Source. */
export async function loadPack(source: string, fetchFn: typeof fetch = fetch): Promise<Pack> {
  const manifestUrl = new URL(source, globalThis.location?.href)
  // The manifest is parsed BEFORE its Topic file list is trusted enough to fetch from.
  const m = parseManifest(await getJson(manifestUrl, fetchFn))
  if (!m.ok) throw new InvalidPackError(m.problems)
  const { manifest } = m

  const files = await Promise.all(manifest.topics.map((t) => getJson(new URL(t.file, manifestUrl), fetchFn)))
  const t = parseTopics(manifest, files)
  if (!t.ok) throw new InvalidPackError(t.problems)
  const { topics } = t
  return { source, manifest, topics }
}

async function getJson(url: URL, fetchFn: typeof fetch): Promise<unknown> {
  const res = await fetchFn(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}
