# Map: Bite-sized code-reading trainer

Label: wayfinder:map

## Destination

An MVP spec, ready to hand to a build agent, for an open-source, statically hosted PWA where Learners spend 10–15 min/day reading code and answering no-typing Exercises — covering the language-agnostic engine, the Pack format, the two Exercise Types, and the outline of one official Rust Pack. Building it is a separate effort.

## Notes

- Domain: learning app / PWA / content format design. Vocabulary lives in `/CONTEXT.md` — use it; update it via `/domain-modeling` when terms change.
- Tracker: local markdown, see `docs/agents/issue-tracker.md`.
- Every grilling ticket: invoke `/grilling` and `/domain-modeling`. Prototype tickets: `/prototype`. Research: `/research` subagent.
- Settled while charting (no ticket; treat as fixed):
  - Learner already programs (other language, or already Rust). No beginners.
  - Packs are static JSON, loaded at runtime from any URL; official Rust Pack hosted next to the app. Authors write JSON directly (no markdown compile step assumed).
  - Pack format is language-agnostic from day one; only Rust ships, plus a tiny second-language Pack as a format test.
  - Two Exercise Types: Choice and Line-Select. predict-output / predict-error / pick-refactor are Flavors of Choice. No Parsons, fill-blank, or match-pairs (too childish for this Learner).
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

## Not yet specified

- **Session composition** — how a Session mixes new Exercises and Review Queue items to land in 10–15 min; what "Session completed" means for the Streak. Waits on the spaced-repetition research and Progress Log design.
- **Mastery formula** — how Topic Mastery is derived, and how Time Budget overruns weigh in. Waits on spaced-repetition research.
- **Pack verification tooling** — per-language author-time checks (e.g. run rustc to confirm a claimed compiler error); whether any of it is in the MVP spec. Waits on the Pack format prototype.
- **Third-party Pack trust & discovery** — loading Packs from arbitrary URLs: sanitising content, CORS, a Pack directory. Waits on Pack format + tech stack.
- **Does pick-refactor really fit Choice?** — user has doubts; expected to be answered by the Pack format prototype, may graduate into its own ticket.
- **Accessibility, theming, i18n of UI chrome** — unclear how much the MVP spec must say.
- **Spec assembly** — the final act: fold all decisions into one MVP spec document.

## Out of scope

- Sync between app instances — only export/import in MVP; Progress Log is shaped so sync can be added in a later effort.
- In-app code execution (WASM, Playground API).
- Live per-user LLM-generated Exercises.
- Building the MVP itself.
- Exercise Types beyond Choice and Line-Select.
- "Ask AI" beyond deep links (BYO API key, localhost/Ollama bridge) — research showed copy-prompt + deep link + Web Share suffices for MVP; see the deep-link ticket.
