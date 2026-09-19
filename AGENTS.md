# Bite Trainer

A static, offline-capable PWA for building programming-language fluency by _reading_ code: short daily Sessions of
no-typing Exercises, spaced repetition, content in language-agnostic Packs. The app is in `app/` (Svelte 5, Vite,
strict TypeScript, pnpm); run every command from there.

## Read before you act

- **Naming anything, or writing text a Learner sees** → [`CONTEXT.md`](CONTEXT.md). The glossary is the vocabulary
  for identifiers, tests and UI. A concept without a word gets one there first.
- **Writing or changing code or tests** → [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md). How code is shaped here and
  why: `core/` decides and `ui/` renders, parse at the boundary, time is an input, see every test red.
- **Touching how Pack content is rendered, or how a Pack is identified** → [`docs/adr/`](docs/adr). Those two
  decisions are deliberate and hard to reverse.
- **Changing how the Exercise screen looks** →
  [`docs/design/exercise-screen-prototype.html`](docs/design/exercise-screen-prototype.html), variant B (open it with
  `?variant=B`). It is the approved design: port from its CSS and markup. The app deviates in three deliberate ways —
  A–D keys under the code, select-then-Check, and Line-Select's Check in that same pinned row.
- **Asked what to build next, or working a planning ticket** → `.scratch/bite-trainer/map.md`, if it exists. The
  planning trail (decision map, tickets, build log) is local and git-ignored, so a fresh clone has none; then ask.
  Tracker mechanics: [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

## What the environment will not tell you

- **Done means `pnpm verify` and `pnpm e2e` both exit 0.** The commit gate runs only `verify` (and `verify-pack` when
  a Pack or the verifier changed). Nothing runs the Playwright suite for you, and it has caught about half of the
  real bugs. Read exit codes, not a grepped summary line.
- **The service worker exists only in the production build.** Offline and install behaviour is tested by `pnpm e2e`
  (which builds) or by `pnpm build && pnpm preview`; `pnpm dev` has no service worker.
- **`pnpm verify-pack` needs `rustc` on the PATH.** It compiles every Exercise's snippet to check its Claim. Without
  `rustc` the gate warns and skips — then the content is unverified, so say so.
- **`core/` files are also run by Node directly** (the verifier uses native type stripping): import siblings with an
  explicit `.ts` extension and use only erasable TypeScript syntax there (no parameter properties, no enums).
- **Tests read the shipped Pack at run time.** Adding or editing Exercises must not require touching engine tests;
  if it does, the test is coupled to content — fix the test.
- **Commits use the repository's configured identity** (a GitHub noreply address). Keep personal names, emails and
  machine paths out of files and commit messages.
