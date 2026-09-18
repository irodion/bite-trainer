import type { Pack, PackManifest, Topic } from './types'
import { validatePack } from './validate'

/** A fetched Pack failed validation; `problems` is Learner-readable. */
export class InvalidPackError extends Error {
  constructor(readonly problems: string[]) {
    super(`This Pack has problems:\n${problems.join('\n')}`)
  }
}

/** Fetch and validate a whole Pack (manifest + every Topic file) from its Pack Source. */
export async function loadPack(source: string, fetchFn: typeof fetch = fetch): Promise<Pack> {
  const manifestUrl = new URL(source, globalThis.location?.href)
  const manifest = (await getJson(manifestUrl, fetchFn)) as PackManifest
  const files = Array.isArray(manifest?.topics) ? manifest.topics : []
  const topics = (await Promise.all(files.map((t) => getJson(new URL(t.file, manifestUrl), fetchFn)))) as Topic[]
  const problems = validatePack(manifest, topics)
  if (problems.length) throw new InvalidPackError(problems)
  return { source, manifest, topics }
}

async function getJson(url: URL, fetchFn: typeof fetch): Promise<unknown> {
  const res = await fetchFn(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}
