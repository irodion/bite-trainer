// Usage: pnpm verify-pack [path/to/pack.json ...]   (defaults to every Pack under public/packs)
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { rustcToolchain } from './rustc.ts'
import { verifyPack } from './verifyPack.ts'

const root = join(import.meta.dirname, '../../public/packs')
const given = process.argv.slice(2)
const manifests = given.length ? given : readdirSync(root).map((d) => join(root, d, 'pack.json'))

let failed = false
for (const manifest of manifests) {
  const started = Date.now()
  const { exercises, problems } = await verifyPack(manifest, rustcToolchain())
  for (const p of problems) console.error(`  ✘ ${p}`)
  const verdict = problems.length ? `${problems.length} problem(s)` : 'every claim holds'
  console.log(`${manifest}: ${exercises} Exercises, ${verdict} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
  failed ||= problems.length > 0
}
process.exit(failed ? 1 : 0)
