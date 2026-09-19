# Code conventions

Formatting and lint rules live in the tooling (`.prettierrc.json`, `eslint.config.js`) and are enforced by the commit
gate, so they are not repeated here. This file holds what no config can say: how the code is shaped, and why. Each
convention below was earned by a real bug found while building or reviewing this app.

## Vocabulary

Use the words in [`CONTEXT.md`](../CONTEXT.md) — Pack, Topic, Exercise, Claim, Session, Progress Log, Instance — in
identifiers, comments, test names and UI text. When a concept has no word yet, add it to `CONTEXT.md` first. The
glossary holds meaning only; implementation detail belongs in code or an ADR.

## Shape of the code

**`core/` is the engine; `ui/` renders it.** Anything that decides something — what is due, whether a Session is
complete, how long a Learner looked — is a function in `app/src/core/`, free of Svelte, the DOM and IndexedDB (lint
enforces the imports). Components collect input and display results. When a fix is needed inside a component's logic,
the fix usually starts by moving that logic into `core/`.

**Parse at the boundary; trust inside it.** Data from outside — a fetched Pack, an imported progress file, records
read back from IndexedDB — enters through exactly one parser (`parsePack`, `parseProgressLog` / `readStored`) that
builds typed values field by field from `unknown`. Build the typed object as a literal so the compiler forces every
declared field to be produced. Everything behind the boundary takes the types at their word: no casts over raw JSON,
no re-checking in folds. A known field that is wrong or missing is always a reported problem; unknown fields are
dropped (Packs) or carried along untouched (log events from a newer app).

**Derived state is a pure fold over the Progress Log.** Review Queue, Mastery, Streak, the unfinished Session and the
end-of-Session summary are functions of `(events, now, …)`. Nothing derived is stored. The log is append-only: undo
is a new event (`reset`), never a deletion.

**Time is an input.** Core functions take `now` and `tzOffsetMin` as parameters; they do not read the clock. In the
UI, time-dependent values derive from the reactive `app.now` — a `Date.now()` call inside `$derived` is not a
dependency and freezes the screen at the moment the log last changed. "Which day" always means the Learner's local
day at the time the event was written.

**Decide before you await.** When a decision depends on mutable state (`app.session`), read that state and make the
decision synchronously, then do the async work. State read after an `await` may have been changed by a tap in
between.

**The app shows only what it has recorded.** A verdict appears after its attempt is durably in the log, and events
that belong together (the last attempt and its `session-completed`) are written in one transaction. A failed write
stores nothing and leaves a way to retry.

**Pack content is inert.** Pack strings are rendered as text nodes through the restricted-Markdown token tree, never
as HTML ([ADR 0001](adr/0001-pack-content-is-never-rendered-as-html.md)). A Pack is identified by the id it declares,
never by its URL ([ADR 0002](adr/0002-pack-identity-is-the-declared-id.md)).

## Tests

**Test at the public seam, in the domain's words.** A test name states a capability or a guarantee a Learner or Pack
author would recognise — "a Session left halfway is still unfinished later the same day" — and exercises a public
function or the real app. Tests survive a rewrite of the internals.

**See it red.** Write the test first and watch it fail for the right reason. When a test passes on its first run,
prove it can fail: break the behaviour on purpose, watch the test go red, restore. Restore from a backup copy
(`cp file /tmp/file.bak`) — `git checkout -- file` also throws away every other uncommitted change in that file.

**Fakes only at the system boundary** — `fetch`, the Pack store, the compiler toolchain, the clock. Collaborators
inside the app are used for real.

**Expected values come from an independent source**: a literal, a worked example, the compiler. An assertion that
recomputes its expectation the way the code does can never disagree with it.

**Tests do not depend on Pack content.** Read counts, ids and the version from the shipped Pack at test time; content
changes must not break engine tests.

**Unit tests for rules, Playwright for journeys.** `pnpm test` covers `core/` and the verifier. `pnpm e2e` drives the
production build for what only a browser can show: offline use, import, storage that is slow or fails, a device that
slept, the day rolling over. Playwright's fake clock and request routing make these deterministic.

## Svelte

- Svelte 5 runes. Shared state lives in `app/src/state.svelte.ts`.
- Key every `{#each}` by a stable id.
- A helper named `state` shadows the `$state` rune — pick another name.
- Edit templates with exact-match edits and re-run the formatter; Prettier re-wraps markup, so a scripted
  find-and-replace can miss silently.

## Packs

- Authors write JSON directly; `code` is an array of lines so a diff shows exactly which line changed.
- Every Exercise carries a Claim, and `pnpm verify-pack` must agree with it. Options are shuffled at display time, so
  they are written to stand alone.
- When an Exercise is adapted from elsewhere, name its origin in `source` and keep the Pack's licence notice current.

## Commits

One logical change per commit, imperative subject, a body that says what was wrong and what is now true. Commit after
each finished change rather than stacking several uncommitted ones. The gate (`.githooks/pre-commit`) runs
`pnpm verify`, plus `pnpm verify-pack` when a Pack or the verifier changed; fix the cause rather than bypassing it.
`main` takes changes only by pull request, rebased onto it; CI runs `verify`, `verify-pack` and `e2e` and all three
must pass. Run `pnpm e2e` yourself before opening the pull request — it is quicker than waiting to be told.
