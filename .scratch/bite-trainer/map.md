# Map: Bite-sized code-reading trainer

Label: wayfinder:map

## Destination

A working MVP of an open-source, statically hosted PWA where Learners spend 10–15 min/day reading code and answering no-typing Exercises — language-agnostic engine, the Pack format, the two Exercise Types, and a starter official Rust Pack. Redrawn 2026-09-18: originally a spec to hand off; the user chose to build now and settle details against running code.

## Notes

- Domain: learning app / PWA / content format design. Vocabulary lives in `/CONTEXT.md` — use it; update it via `/domain-modeling` when terms change.
- Tracker: local markdown, see `docs/agents/issue-tracker.md`.
- Every grilling ticket: invoke `/grilling` and `/domain-modeling`. Prototype tickets: `/prototype`. Research: `/research` subagent.
- **Build-first (overrides wayfinder's plan-don't-do):** the app lives in `app/` (`pnpm dev`; `pnpm verify` = format check + lint + typecheck + unit tests, enforced by the `.githooks/pre-commit` gate; `pnpm e2e` for the offline Playwright tests; `pnpm format` to fix style). Resolve a ticket by building the smallest working version and showing it to the user, not by grilling. Earlier ticket answers are starting defaults, not contracts — change them when the code disagrees, and note it in the ticket.
- **Altitude:** decide only what the spec must fix — behaviour a Learner or Pack author can observe, and choices that are hard to reverse. Field names, thresholds, API picks and storage layout are agent-chosen defaults: record them as revisable, don't put them to the user. Keep grilling to one short round where possible.
- Settled while charting (no ticket; treat as fixed):
  - Learner already programs (other language, or already Rust). No beginners.
  - Packs are static JSON, loaded at runtime from any URL; official Rust Pack hosted next to the app. Authors write JSON directly (no markdown compile step assumed).
  - Pack format is language-agnostic from day one; only Rust ships, plus a tiny second-language Pack as a format test.
  - Two Exercise Types: Choice and Line-Select. predict-output / predict-error / pick-refactor are Flavors. No Parsons, fill-blank, or match-pairs (too childish for this Learner).
  - Time Budget per Exercise, soft only: overtime recorded, feeds review scheduling, never fails.
  - Per-option Rationales + per-Topic Primer. No live LLM. "Open in Claude/ChatGPT" deep link for further explanation.
  - Purely static: the app never executes code.
  - Session model: linear Topic path + daily Review Queue. Gamification: Streak + Topic Mastery only.
  - Progress is an append-only Progress Log; MVP ships JSON export/import only.
  - Open source, static host (GitHub/Cloudflare Pages), Packs contributed via PR.
  - Rust curriculum: start from rustlings topic list (MIT, attribute), reweighted to reading-heavy topics; LLM-drafted, compiler-verified, human-reviewed.

## Decisions so far

<!-- one line per closed ticket -->

- [Can a static PWA hand an Exercise to Claude/ChatGPT via a prefilled deep link?](issues/02-explain-deep-links.md) — only unofficial https prefill URLs exist; ship "copy prompt + open link" with Web Share first on mobile, targets in app config, ~6k char cap; untested live.
- [Which spaced-repetition algorithm fits a small-item-count code-reading trainer?](issues/01-spaced-repetition-algorithm.md) — in-house 5-box Leitner as a pure fold over the Progress Log (wrong → box 1, overtime → stay, in time → promote); ts-fsrs replay as escape hatch; answer-memorisation is a real risk.
- [What platform constraints bind an offline-first, install-anywhere PWA in 2026?](issues/03-pwa-platform-constraints.md) — must work in a plain tab; installed apps get isolated storage and Safari tabs can lose the whole Progress Log, so export + merge-import is the safety net; Packs need CORS, a version field and stable ids.
- [What does an Exercise screen look like at phone width, and what snippet limits follow?](issues/04-exercise-screen-prototype.md) — code pinned full-screen with answers in a bottom sheet plus pinned A–D keys; select then Check; horizontal scroll at 13px, never wrap; snippets capped at 30 lines × 60 columns; Line-Select taps the gutter with taller rows.
- [What is the JSON shape of a Pack, Topic, Primer and Exercise?](issues/05-pack-format-prototype.md) — manifest + per-Topic JSON files; code as arrays of lines, prose as restricted Markdown; Choice options are text or code, Line-Select takes several correct lines; Flavors are an open per-Pack set on both Exercise Types; pick-refactor fits Choice; authors write JSON directly.
- [What tech stack does the spec prescribe?](issues/06-tech-stack.md) — Svelte 5 + plain Vite + strict TS with a framework-free `core/`; runtime Shiki (JS engine, lazy grammars) rendered from tokens; `idb`; vite-plugin-pwa injectManifest with the page validating and caching Packs; one repo; Vitest + Playwright (offline checks Chromium-only); Cloudflare, host-agnostic build. Pack content is never rendered as HTML ([ADR 0001](../../docs/adr/0001-pack-content-is-never-rendered-as-html.md)).
- [How are Packs and Exercises identified and versioned so progress survives Pack updates?](issues/07-pack-identity-and-versioning.md) — a Pack is its declared reverse-domain `id`, the URL is only its Pack Source ([ADR 0002](../../docs/adr/0002-pack-identity-is-the-declared-id.md)); progress keys on `(packId, exerciseId)` with Pack-unique ids; same id = same Exercise, orphaned events are ignored not deleted; `version` is an opaque equality-only string; stale-while-revalidate with atomic whole-Pack updates, never mid-Session; the official Pack takes the same path as any other.
- [What events make up the Progress Log, and how do export/import work?](issues/08-progress-log-schema.md) — three event types (`attempt` with the verdict stored as judged, `session-completed` for Streak, `reset` for per-Pack erase); unique event + Instance ids so import is a set union; export is the whole log plus installed Packs; unknown event types survive round-trips; all derived state is a pure fold. Field-level details are revisable defaults.
- [Does the app install and run a full Session offline?](issues/14-offline-pwa-shell.md) — yes, held by a Playwright test; service worker precaches the shell only, Packs are validated then stored whole as one IndexedDB record (amends the Cache Storage plan) with stale-while-revalidate that applies on next launch; `persist()` after the first Session.

## Not yet specified

- **Accessibility and i18n of UI chrome** — unclear how much the MVP spec must say (keyboard/screen-reader use of the code pane and Line-Select, UI strings). Theming is settled: CSS tokens + `prefers-color-scheme`.
- **"Explain more" deep link / Web Share** — not built yet.

## Out of scope

- Sync between app instances — only export/import in MVP; Progress Log is shaped so sync can be added in a later effort.
- In-app code execution (WASM, Playground API).
- Live per-user LLM-generated Exercises.
- Exercise Types beyond Choice and Line-Select.
- "Ask AI" beyond deep links (BYO API key, localhost/Ollama bridge) — research showed copy-prompt + deep link + Web Share suffices for MVP; see the deep-link ticket.

## Build log

- 2026-09-18 — First vertical slice in `app/`: loads the Rust Pack from `public/packs/rust`, Session of due reviews + new Exercises, Exercise screen (layout B + A–D keys, Choice with text/code options, Line-Select via gutter, Rationales, Primer, visible-time clock), Progress Log in IndexedDB (`attempt` / `session-completed` / `reset`), Leitner fold, Mastery bars, Streak, export + merge-import. Found while running it: `session-completed` must be written on the last Check, not on "Next", or leaving after the last answer loses the Streak day (fixed); the A–D keys duplicate the options when the sheet is open at desktop width (open); with 4 Exercises a Session is ~5 min, so content volume, not engine, is the bottleneck.
- 2026-09-18 — Exercise screen rebuilt from the approved prototype (`prototype/exercise-screen`, variant B): its tokens, fonts (self-hosted via fontsource), syntax palette (Shiki css-variables theme), collapsed sheet with Time Budget ring, A–D keys, notes, Primer scrim, "Explain more in Claude". Lesson: build UI from the prototype source, never from a ticket's prose summary. Deviation from the prototype: Line-Select's "Line N selected · Check" sits in the pinned row under the code, because with the sheet collapsed there was no visible way to confirm. `app/frames.html` is a dev harness (phone + desktop side by side).
