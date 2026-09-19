# Bite Trainer

[![CI](https://github.com/irodion/bite-trainer/actions/workflows/ci.yml/badge.svg)](https://github.com/irodion/bite-trainer/actions/workflows/ci.yml)

Build fluency in a programming language by **reading** code for 10–15 minutes a day — no typing.

You are shown a short, real snippet and asked one question about it: _what does it print?_, _why won't it compile?_,
_which rewrite is equivalent?_, or _tap the line the compiler rejects_. Every option explains why it is right or wrong.
What you miss comes back tomorrow; what you know comes back later and later.

It is for people who **already program** — in another language, or already in this one — and want to get fast at
reading it. It ships with one Pack: 48 Rust Exercises adapted from [rustlings](https://github.com/rust-lang/rustlings).

> **Status: working prototype.** It runs, it is tested, and it has not yet been used daily by anyone or checked on
> real phones. Expect rough edges.

## How it works

- **A static web app.** No server, no account, no tracking. It never executes code: every claim an Exercise makes was
  proven by the real compiler when the Exercise was written.
- **Works offline and installs** like an app (PWA). Your progress lives only in your browser; _Export_ / _Import_ moves
  it between devices and is your backup.
- **Content comes in Packs** — plain JSON, loadable from any URL, one per language. The engine knows nothing about
  Rust.
- **Spaced repetition** with five Leitner boxes. A correct answer over the Exercise's Time Budget does not move up: the
  goal is fluent reading, not eventual decoding.

## Run it

Requires Node 24+ and [pnpm](https://pnpm.io). Everything lives in `app/`.

```sh
cd app
pnpm install        # also activates the commit gate (.githooks)
pnpm dev            # http://localhost:5173
```

The service worker exists only in the production build: `pnpm build && pnpm preview` to try offline and install.

| Command            | What it does                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `pnpm verify`      | Format check, lint, typecheck, unit tests. Runs on every commit that touches `app/`.            |
| `pnpm e2e`         | Playwright tests against the production build (offline, import, day rollover, slow storage, …). |
| `pnpm verify-pack` | Checks every Exercise's claim with `rustc`. Needs a Rust toolchain. Runs when a Pack changes.   |
| `pnpm format`      | Fix formatting.                                                                                 |

## Writing a Pack

A Pack is a `pack.json` manifest plus one JSON file per Topic — see [`app/public/packs/rust`](app/public/packs/rust)
for a complete one and [`app/src/core/types.ts`](app/src/core/types.ts) for the format. The rules that make a Pack
good are enforced by `pnpm verify-pack path/to/pack.json`:

- every Exercise carries a machine-checkable **Claim** — it prints exactly this; it fails to compile with this error
  on this line; it compiles — and the compiler must agree;
- snippets fit a phone without wrapping: at most 30 lines × 60 columns;
- every option has a Rationale, and no option refers to another by position (the app shuffles them).

Only Rust has a toolchain adapter today; another language needs one more
([`app/tools/verify-pack/rustc.ts`](app/tools/verify-pack/rustc.ts) is the whole interface).

## Where things are

| Path                    | What                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `app/src/core/`         | The engine: framework-free TypeScript — parsing, scheduling, Sessions, the Progress Log. No DOM.      |
| `app/src/ui/`           | Svelte 5 components. They render what `core/` computes.                                               |
| `app/tools/verify-pack` | The author-time Pack verifier.                                                                        |
| `app/public/packs/`     | The official Packs.                                                                                   |
| `CONTEXT.md`            | The project's vocabulary (Pack, Topic, Exercise, Claim, Session, …). Code and docs use these words.   |
| `docs/adr/`             | Decisions that are hard to reverse, and why they were made.                                           |
| `docs/CONVENTIONS.md`   | How code is written here.                                                                             |
| `docs/design/`          | The approved Exercise screen prototype — the design source for the UI.                                |

## Contributing

Read [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) first. `main` is protected: changes arrive by pull request, CI
(`verify`, `verify-pack`, `e2e`) must pass, and merges are rebased so history stays linear. A pull request from a
fork waits for a maintainer to approve its CI run. Content fixes — a misleading Rationale, an unfair
distractor — are as welcome as code: edit the Topic JSON and let `pnpm verify-pack` check that the compiler still
agrees with you.

## Licence and credits

[MIT](LICENSE).

The Rust Pack is adapted from **rustlings** (MIT, © 2016 Carol (Nichols || Goulding)); each Exercise names the rustlings
exercise it came from, and the Pack carries its own [notice](app/public/packs/rust/LICENSE). The app bundles the
IBM Plex Sans and JetBrains Mono typefaces (SIL Open Font License 1.1) and uses
[Shiki](https://shiki.style) for highlighting, [Svelte](https://svelte.dev), and [idb](https://github.com/jakearchibald/idb).
