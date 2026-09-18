import { openDB, type IDBPDatabase } from 'idb'
import type { PackStore } from './core/openPack'
import type { LogEvent, Pack } from './core/types'

let dbp: Promise<IDBPDatabase> | undefined

function db(): Promise<IDBPDatabase> {
  return (dbp ??= openDB('bite-trainer', 2, {
    upgrade(d, oldVersion) {
      if (oldVersion < 1) {
        d.createObjectStore('events', { keyPath: 'id' })
        d.createObjectStore('meta')
      }
      if (oldVersion < 2) d.createObjectStore('packs', { keyPath: 'source' })
    },
  }))
}

export async function allEvents(): Promise<LogEvent[]> {
  return (await db()).getAll('events')
}

export async function instanceId(): Promise<string> {
  const d = await db()
  let id = (await d.get('meta', 'instanceId')) as string | undefined
  if (!id) {
    id = crypto.randomUUID()
    await d.put('meta', id, 'instanceId')
  }
  return id
}

/** Set-union by event id; returns how many were new. */
export async function addEvents(events: LogEvent[]): Promise<number> {
  const tx = (await db()).transaction('events', 'readwrite')
  let added = 0
  for (const e of events) {
    if (!(await tx.store.getKey(e.id))) {
      await tx.store.add(e)
      added++
    }
  }
  await tx.done
  return added
}

/** Whole Packs, one record per Pack Source — a single IndexedDB put, so an update can never be half-applied. */
export const packStore: PackStore = {
  get: async (source) => (await db()).get('packs', source) as Promise<Pack | undefined>,
  put: async (pack) => void (await (await db()).put('packs', pack)),
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db()).get('meta', key)
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', value, key)
}
