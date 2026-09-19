# What Topics does the official Rust Pack contain, and how is it authored?

Type: grilling
Status: resolved
Blocked by: 05

## Question

Starting from the rustlings topic list (MIT, attribute), reweight toward reading-heavy skills (borrow-checker reasoning, lifetimes, trait resolution, iterator chains, error handling). Decide: Topic list and order, target Exercise count per Topic and Flavor mix, difficulty progression for a Learner who already programs, the authoring pipeline (LLM-drafted, compiler-verified, human-reviewed — who does what), and how much of the Pack the MVP spec requires at launch.

## Answer

Resolved by building it (build-first): the official Rust Pack now holds **48 Exercises in 10 Topics**, every one proven by `rustc` (see the Pack verification ticket). The user's direction: use rustlings as the *direct* source of questions.

**Topics, in path order (Exercise count)**
  1. **Variables & types** — 5
  2. **Ownership & borrowing** — 7
  3. **Strings & collections** — 4
  4. **Enums, Option & matching** — 5
  5. **Error handling** — 6
  6. **Traits & generics** — 5
  7. **Lifetimes** — 4
  8. **Iterators & closures** — 6
  9. **Smart pointers** — 3
  10. **Conversions** — 3

Flavor mix: predict-output 26, predict-error 10, find-the-line 10, pick-refactor 2. Every Topic has a Primer.

**How a rustlings exercise becomes an Exercise**
- rustlings exercises are "fix this broken code" inside a test harness. Each is rewritten as a self-contained program with `main` (tests become `println!`), within the 30-line × 60-column limit.
- The *broken* version becomes **predict-error** (Choice) or **find-the-line** (Line-Select). The *solution* becomes **predict-output**, or **pick-refactor** when the fix is an idiomatic rewrite.
- Distractors are the plausible misreadings of that snippet (off-by-one range, "`or_insert` overwrites", "generics are dynamic typing", "`?` panics"); every option carries a Rationale.
- Each Exercise records `source: "rustlings: <exercise>"`; the manifest carries the MIT attribution. Pack id is now `io.github.irodion.rust` (ADR 0002), version 0.2.0.

**Reweighting vs rustlings:** dropped intro, functions, if, modules, tests, macros, clippy (little to *read*); threads/async dropped because output is nondeterministic or needs a runtime — revisit with a `compiles`-only Flavor. Ownership, error handling, traits, iterators weighted heaviest.

**Pipeline that worked:** LLM drafts Exercise + claim → `pnpm verify-pack` → fix what the compiler disputes → human review of Rationales (NOT yet done — the user has not read the 44 new Exercises). The compiler disputed 2 of 44 drafted claims (E0271 vs E0277; a snippet without `main`) and 8 width limits.

**Launch size:** 48 Exercises ≈ 6 days of new material at ~8 per Session, then reviews. Enough to dogfood; growing it is content work, not a decision.
