import { InvalidPackError, loadPack } from './pack'
import { parsePack } from './parsePack.ts'
import type { Pack } from './types'

/** Where whole, validated Packs are kept between launches. One record per Pack Source, so a write is atomic. */
export interface PackStore {
  get(source: string): Promise<Pack | undefined>
  put(pack: Pack): Promise<void>
}

/** What the background check of the Pack Source found. */
export type UpdateResult = 'fresh' | 'unchanged' | 'updated' | 'offline' | 'invalid'

export interface OpenedPack {
  /** The Pack to use for this launch. Never swapped underneath a running Session. */
  pack: Pack
  /** Settles once the Pack Source has been re-checked; an update applies the next time the Pack is opened. */
  update: Promise<UpdateResult>
}

/** Stale-while-revalidate: serve the stored Pack at once, refresh the store in the background. */
export async function openPack(source: string, deps: { fetchFn: typeof fetch; store: PackStore }): Promise<OpenedPack> {
  const cached = stillValid(await deps.store.get(source))
  if (!cached) {
    const pack = await loadPack(source, deps.fetchFn)
    await deps.store.put(pack)
    return { pack, update: Promise.resolve('fresh') }
  }
  return { pack: cached, update: revalidate(cached, deps) }
}

async function revalidate(cached: Pack, deps: { fetchFn: typeof fetch; store: PackStore }): Promise<UpdateResult> {
  try {
    const latest = await loadPack(cached.source, deps.fetchFn)
    if (latest.manifest.version === cached.manifest.version) return 'unchanged'
    await deps.store.put(latest)
    return 'updated'
  } catch (e) {
    return e instanceof InvalidPackError ? 'invalid' : 'offline'
  }
}

/**
 * A stored record goes through the same parser as a fetched Pack. One that no longer parses — written by an older
 * build, another format version, or corrupted — counts as not stored, so it is refetched instead of crashing the UI.
 */
function stillValid(stored: Pack | undefined): Pack | undefined {
  if (!stored) return undefined
  const parsed = parsePack(stored.manifest, stored.topics)
  return parsed.ok ? { source: stored.source, manifest: parsed.manifest, topics: parsed.topics } : undefined
}
