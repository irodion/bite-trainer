# What tech stack does the spec prescribe?

Type: grilling
Status: resolved
Blocked by: 03

## Question

User has no preference yet. Decide: UI framework (React / Svelte / Solid / vanilla), TypeScript, build tool + PWA plugin, storage layer (IndexedDB wrapper), syntax highlighter and whether highlighting happens at runtime or is pre-rendered, testing approach, static host (GitHub Pages vs Cloudflare Pages), repo layout (app + official Packs + schema in one repo?). Informed by the PWA platform constraints research.

## Answer

Settled with the user, who had no stack preference: they confirmed the architectural choices and the host, then delegated the pure tooling picks to the agent. The shaky claims were fact-checked against primary sources on 2026-09-18 (versions below are from that check).

**App**
- **Svelte 5 + plain Vite 8 (no SvelteKit), strict TypeScript.** `@sveltejs/vite-plugin-svelte`, typecheck with `svelte-check`. React was the fallback, rejected for ~45 KB and no gain.
- **Engine is a framework-free `core/` TS module** (Leitner fold, Session composition, Mastery, Pack validation, import-merge, Markdown parser); no DOM, no Svelte imports. The UI only renders it. This keeps the framework choice reversible.
- **Routing:** hand-rolled hash router, one HTML document, relative base path — works on any static host without rewrites.
- **Styling:** Svelte scoped styles + one `tokens.css` of CSS custom properties (colour, spacing, Learner-adjustable code font size); light/dark from `prefers-color-scheme`. No CSS framework, no component kit.
- **Dependency budget:** runtime deps are `svelte`, `shiki`, `idb` (+ the validator runtime helpers); anything else needs a written justification.

**Highlighting**
- **Runtime, in the app** — Packs carry plain code lines plus `language.highlight`; never pre-rendered tokens.
- **Shiki 4 via `shiki/core` + `createJavaScriptRegexEngine`** (no Oniguruma WASM; Rust and Python confirmed OK on the JS engine), regular `@shikijs/langs` grammars (the precompiled ones are not production-ready), each grammar lazy-loaded by dynamic import keyed on `language.highlight`, precached by the service worker. Dual light/dark themes via CSS variables. Unknown grammar id → plain text. The spec lists the bundled grammar ids. Expected cost ~50–70 KB gzip total — an estimate; measure in the real build.
- **Render from `codeToTokens`, never from Shiki's HTML string** (see ADR).

**Pack content safety** — ADR `docs/adr/0001-pack-content-is-never-rendered-as-html.md`: purpose-built restricted-Markdown parser in `core/` → AST → Svelte elements; `{@html}`/`innerHTML` forbidden for anything from a Pack; out-of-grammar input renders as literal text.

**Storage & offline**
- **Progress Log in IndexedDB through `idb` 8**, behind a small `ProgressStore` interface with an in-memory fake for tests. The log is folded in memory, never queried. Cached Packs live in Cache Storage.
- **`vite-plugin-pwa` 1.x, `injectManifest` strategy, TypeScript service worker, `registerType: 'prompt'`** (`virtual:pwa-register/svelte`). The update prompt never interrupts a Session.
- **The page, not the service worker, fetches, validates and `cache.put()`s Packs** (CORS mode, never opaque); the service worker only precaches the shell and serves cached Packs. One validator, one place.

**Schema, validation, lint**
- JSON Schema stays the source of truth. Types generated with `json-schema-to-typescript`, which only really understands draft-07 vocabulary — so the Pack schemas are **restricted to the common subset** (`$defs` fine; no `prefixItems`, `unevaluatedProperties`, `$dynamicRef`).
- Runtime validator: **ajv standalone code generated at build time** (no `new Function`, so a strict CSP without `unsafe-eval` holds). Standalone + the 2020-12 class is unverified — the build agent spikes it first; fallback is `@cfworker/json-schema` (interpreter, no eval).
- **The Python lint prototype is rewritten in TypeScript** inside `core/`, so the in-app pre-cache validation and the author-time CLI lint are the same code.

**Testing**
- **Vitest** on `core/` carries the weight: Leitner fold, import-merge idempotence, Pack validator against fixture Packs plus deliberately broken ones, Markdown parser (including injection attempts).
- **Playwright** smoke tests at 375 px and 1180 px against `vite preview` (the built app): complete a Choice and a Line-Select Exercise; export → wipe → import round-trip. **Offline / service-worker assertions run in the Chromium project only** — Playwright cannot observe service workers in WebKit and `setOffline` is unreliable there; WebKit runs the functional smoke tests only. Real iOS Safari stays a manual check.
- No component-level tests.

**Repo, CI, host**
- **One repo:** `app/`, `packs/rust/`, `packs/python-mini/`, `schema/`, `tools/`; Packs copied into the build output under `/packs/…`. No workspaces or monorepo tool until a second package needs them.
- pnpm, Node LTS pinned in `.nvmrc`, one `pnpm check` runs everything. **Prettier + `prettier-plugin-svelte` and ESLint + `eslint-plugin-svelte`** — Biome's `.svelte` support is still experimental.
- GitHub Actions on PRs: typecheck, Vitest, Pack lint over `packs/`, Playwright. Deploys come from the host's Git integration, not from Actions.
- **Host: Cloudflare** (user already hosts there). Cloudflare now steers new projects to **Workers Static Assets** rather than Pages; `_headers` (CORS on `/packs/*`, `Cache-Control: no-cache` on `sw.js`) works identically on both, and PR previews on Workers need "builds for non-production branches" switched on. Spec prescribes Workers Static Assets, with Pages an acceptable equivalent. **The build must stay host-agnostic** — plain static output, no Functions/Workers code — so forks can use GitHub Pages.

Unverified: real Shiki bundle size; ajv standalone with 2020-12; everything on real devices.

