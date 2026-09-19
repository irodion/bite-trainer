# What author-time verification must a Pack pass, and how much of it does the MVP spec include?

Type: grilling
Status: resolved

## Question

The Pack format prototype produced two layers of checking: JSON Schema (structure) and a lint (cross-field rules: one correct option, declared Flavors, line numbers inside the snippet, 30×60 limits, id uniqueness). A third layer is only sketched: proving an Exercise's *claim* — that the snippet really prints what the correct option says, or really fails with the stated error on a `correctLines` line — by running the language toolchain (`language.verifiedWith`). Decide: which layers the MVP spec requires; whether claim-verification is generic (a per-language runner contract) or Rust-only for now; whether an Exercise needs extra machine-readable fields for it (expected stdout, expected error code); where it runs (CI on Pack PRs?); and what third-party Pack authors are expected to run.

Input from the tech stack ticket: the schema + lint layers are one TypeScript implementation in the app's `core/`, shared by the in-app pre-cache validation and the author-time CLI; Pack schemas are restricted to the draft-07-compatible subset of JSON Schema.

Input from the Pack identity ticket: lint also checks the reverse-domain Pack `id` pattern, Pack-wide uniqueness of Exercise and Topic ids, and (in CI, against the base branch) that content changes come with a changed `version`; ideally it also warns when an Exercise keeps its id but its correct answer changed. The CLI rejects unknown fields while the app ignores them — same schema, `additionalProperties` toggled by mode.

## Answer

Built test-first in `app/tools/verify-pack/` (19 tests, 5 of them against the real `rustc`). Run with `pnpm verify-pack [pack.json …]`; exit code 1 on any problem.

**Layers, all required for the official Pack**
1. **Structure** — `core/validate.ts` `validatePack`, the same code the app runs before storing a Pack.
2. **Authoring limits** — 30 lines × 60 columns per snippet (author-time only; the app does not refuse a wider Pack).
3. **Claims** — every Exercise must carry `verify`, one of: `{ "stdout": "…" }` (compiles, runs, prints exactly this, trailing whitespace ignored), `{ "error": "E0382", "line"?: n }` (fails to compile with that code; for Line-Select every reported line of that code must be in `correctLines`), `{ "compiles": true }`. An Exercise with no claim is a problem, so nothing ships unverified by accident. For single-line predict-output, the correct option's text must equal the verified stdout.

**Generic, not Rust-only:** `verifyExercise(exercise, toolchain)` depends on a `Toolchain` interface (`run(code) → { compiled, stdout, errors[{code, line}] }`). `rustc.ts` is the only adapter; a second language is one more adapter. Snippets without `fn main` compile as a library.

**Where it runs:** the pre-commit gate runs `verify-pack` when `app/public/packs/` or the verifier changes (8 s for 48 Exercises); warns instead of blocking when `rustc` is absent. No CI yet.

**Third-party authors:** same command on their own `pack.json`. The app never checks claims (it never executes code) — it only runs layer 1.

**Not done:** JSON Schema files for editor tooling (the TypeScript validator is the single source of truth for now); the `version`-changed-with-content check and "same id, different answer" warning from the Pack identity ticket; pick-refactor *options* are not machine-checked (the two in the Pack were checked by substitution, by hand).
