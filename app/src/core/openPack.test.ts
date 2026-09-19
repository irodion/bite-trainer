import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { openPack, type PackStore } from './openPack'
import type { Pack } from './types'

const SOURCE = 'https://packs.example/rust/pack.json'
const file = (p: string) => JSON.parse(readFileSync(new URL(`../../public/packs/rust/${p}`, import.meta.url), 'utf8'))

const SHIPPED = file('pack.json') as { version: string; topics: { file: string }[] }

/** A fake Pack host: serves the official Rust Pack, optionally edited, or is unreachable. */
function host(edit: (path: string, json: any) => any = (_, j) => j) {
  const state = { online: true, requests: 0 }
  const fetchFn = (async (input: URL | string) => {
    state.requests++
    if (!state.online) throw new TypeError('Failed to fetch')
    const path = String(input).replace('https://packs.example/rust/', '')
    return new Response(JSON.stringify(edit(path, file(path))))
  }) as typeof fetch
  return { state, fetchFn }
}

function memoryStore(): PackStore {
  const packs = new Map<string, Pack>()
  return { get: async (s) => packs.get(s), put: async (p) => void packs.set(p.source, structuredClone(p)) }
}

test('a Pack opened once can be opened again with the network down', async () => {
  const { state, fetchFn } = host()
  const store = memoryStore()
  const online = await openPack(SOURCE, { fetchFn, store })

  state.online = false
  const offline = await openPack(SOURCE, { fetchFn, store })

  expect(offline.pack.topics.length).toBeGreaterThan(0)
  expect(offline.pack).toEqual(online.pack)
})

test('a Pack with problems is refused and never stored', async () => {
  const { fetchFn } = host((path, json) =>
    path === SHIPPED.topics[0].file ? { ...json, exercises: [{ id: 'x', type: 'essay' }] } : json,
  )
  const store = memoryStore()

  await expect(openPack(SOURCE, { fetchFn, store })).rejects.toThrow(/x: unknown type "essay"/)
  expect(await store.get(SOURCE)).toBeUndefined()
})

const bumped = (v: string) => (path: string, json: any) =>
  path === 'pack.json' ? { ...json, version: v, title: `Rust ${v}` } : json

test('an updated Pack is stored in the background but only takes effect the next time it is opened', async () => {
  const store = memoryStore()
  await openPack(SOURCE, { fetchFn: host().fetchFn, store })

  const next = host(bumped('99.0.0'))
  const opened = await openPack(SOURCE, { fetchFn: next.fetchFn, store })
  expect(opened.pack.manifest.version).toBe(SHIPPED.version)
  expect(await opened.update).toBe('updated')
  expect(opened.pack.manifest.version).toBe(SHIPPED.version)

  const later = await openPack(SOURCE, { fetchFn: next.fetchFn, store })
  expect(later.pack.manifest.title).toBe('Rust 99.0.0')
  expect(await later.update).toBe('unchanged')
})

test('a broken update never replaces the good Pack already stored', async () => {
  const store = memoryStore()
  await openPack(SOURCE, { fetchFn: host().fetchFn, store })

  const broken = host((path, json) =>
    path === 'pack.json' ? { ...json, version: '98.0.0' } : { ...json, exercises: 'gone' },
  )
  const opened = await openPack(SOURCE, { fetchFn: broken.fetchFn, store })
  expect(await opened.update).toBe('invalid')

  const offline = host()
  offline.state.online = false
  const later = await openPack(SOURCE, { fetchFn: offline.fetchFn, store })
  expect(later.pack.manifest.version).toBe(SHIPPED.version)
  expect(await later.update).toBe('offline')
})

test('a Pack never opened before cannot be opened offline', async () => {
  const offline = host()
  offline.state.online = false
  await expect(openPack(SOURCE, { fetchFn: offline.fetchFn, store: memoryStore() })).rejects.toThrow('Failed to fetch')
})
