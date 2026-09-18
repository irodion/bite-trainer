# Does the app install and run a full Session offline?

Type: task
Status: resolved

## Question

Build the PWA shell in `app/` and find out what breaks: `vite-plugin-pwa` (injectManifest) precaching the app shell, fonts and lazy Shiki grammar chunks; a web manifest (name, 192/512 icons, `start_url`, `display`) so Chromium offers install; the page — not the service worker — fetching a Pack with `mode: 'cors'`, validating it whole, then `cache.put()`-ing it, with stale-while-revalidate updates applied atomically and never mid-Session; `navigator.storage.persist()` after the first completed Session with the result shown.

Done when: with the network off, a reload in Chromium still starts and completes a Session against the cached Rust Pack, and the attempt events survive. Record what failed or surprised, and which earlier answers (PWA platform constraints, tech stack, Pack identity) need amending.

Depends on Pack validation existing in `core/` at least as a structural check — build the minimum here if the Pack verification ticket has not landed.

## Answer

Built test-first in `app/`; done-criterion met and held by a test. `pnpm test` (13 unit) and `pnpm e2e` (2 Playwright, Pixel 7 viewport, production build) pass.

**What exists**
- `core/validate.ts` — `validatePack(manifest, topics)` returns Learner-readable problems (format version, required manifest fields, Exercise code/Time Budget/prompt, exactly one correct option, Line-Select lines inside the snippet, unknown types). Structural only; schema/lint/claim layers remain the Pack verification ticket's.
- `core/openPack.ts` — stale-while-revalidate over a `PackStore`: stored Pack served at once; the Pack Source re-checked in the background; a changed `version` is stored and applies on the *next* open (never mid-Session); invalid or unreachable updates leave the stored Pack alone; a never-opened Pack offline is an error. Result surfaced on the home screen (`updated` / `offline` / `invalid`).
- Service worker (`vite-plugin-pwa`, injectManifest, `src/sw.ts`): precaches the app shell only — 37 files, ~674 KB, including fonts and the lazy Shiki grammar chunks. Web manifest + 192/512 placeholder icons.
- `navigator.storage.persist()` requested after the first completed Session; a `false` result shows "storage not protected — export regularly".
- `e2e/offline.spec.ts`: visit online → go offline → reload → complete a 4-Exercise Session with highlighting → reload → Streak, 5 events and "Nothing due" still there. Mutation-checked: fails when the service worker is not registered.

**Amendments to earlier answers**
- *Tech stack / PWA constraints said* the page would `cache.put()` Pack files into Cache Storage. **Changed:** a validated Pack is stored as ONE IndexedDB record keyed by Pack Source. Atomic whole-Pack updates come for free from a single `put`; with Cache Storage it would need a multi-entry swap protocol. Consequence: Progress Log and Packs share one eviction fate (they already did — browsers evict per origin).
- Pack store is keyed by Pack Source for now; re-keying by declared Pack id (ADR 0002) belongs to the third-party Packs ticket, when a second Pack can exist.

**Found along the way**
- Python grammar chunk (70 KB) is precached though no Python Pack ships — trim the grammar table when it matters.
- vite-plugin-pwa 1.3 on Vite 8 works but logs an `inlineDynamicImports` deprecation warning.
- Not verified: real install prompt, iOS Home Screen behaviour, `persist()` outcome on real browsers — belongs to the real-device smoke checks ticket.
