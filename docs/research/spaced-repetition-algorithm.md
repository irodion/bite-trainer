# Spaced-repetition algorithm for the code-reading trainer

Research for ticket `.scratch/bite-trainer/issues/01-spaced-repetition-algorithm.md`. Researched 2026-09-18.

**Question.** Leitner vs SM-2 vs FSRS for: a few hundred Exercises per Pack, binary correct/wrong plus a soft Time Budget overrun signal, state derived purely from the append-only Progress Log, client-only TypeScript. Plus: does re-seeing the same Exercise teach the answer instead of the concept?

Claims are tagged **[source]** when read directly from the linked primary source, and **[inference]** when they are my reasoning from those sources.

## 1. The three algorithms

### Leitner boxes

- Items live in numbered boxes; correct moves an item up one box, wrong sends it back (classically to box 1). Higher boxes are reviewed less often. In Leitner's original 1972 book (*So lernt man lernen*) the schedule was driven by physical partition sizes (1, 2, 5, 8, 14 cm), a partition being reviewed when it filled up; fixed day-intervals per box are a later software convention. [source, secondary: [Wikipedia: Leitner system](https://en.wikipedia.org/wiki/Leitner_system) — the book itself was not consulted]
- Input is inherently binary. State per item is one small integer plus a due marker. [inference]
- Complexity: about 20–40 lines of TS as a pure reducer over the Progress Log. No library needed. No parameters to fit; the interval table is a design choice. [inference]

### SM-2

Read from the algorithm's owner, [SuperMemo: SM-2](https://super-memory.com/english/ol/sm2.htm). [source]

- Intervals: `I(1)=1`, `I(2)=6`, then `I(n)=I(n-1)*EF`.
- Ease factor: `EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))`, floor 1.3, start 2.5.
- Quality `q` is 0–5. Notably the *passing* grades are distinguished by fluency: 5 "perfect response", 4 "correct response after a hesitation", 3 "correct response recalled with serious difficulty".
- `q < 3` restarts the interval sequence without changing EF; anything `< 4` is repeated the same day.
- Complexity: about 30 lines. State per item: repetition count, EF, interval. With only binary input it degenerates: you must pick fixed `q` values for right/wrong, so EF moves along one fixed path. [inference]

### FSRS

Read from [the FSRS algorithm wiki](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm). [source]

- Models three variables per item: Stability, Difficulty (1–10), Retrievability (probability of recall). Interval is chosen so predicted R hits a desired retention (default 0.9).
- 17 parameters in FSRS-4.5, 19 in FSRS-5, 21 in FSRS-6. Four grades: Again / Hard / Good / Easy. FSRS-6 has a separate stability formula for same-day reviews.
- Parameters are meant to be fitted to the user's own review history. Anki's manual says FSRS does poorly with "less than a few hundred" reviews to learn from, and that Hard must mean "recalled with hesitation", never "forgot". [[Anki manual: deck options](https://docs.ankiweb.net/deck-options.html)] [source]
- Evidence of accuracy: the [srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark) (about 350M reviews, about 10k Anki users). Without same-day reviews: FSRS-6 log loss 0.3460; FSRS-7 0.3401; FSRS-7 with *default* (unfitted) parameters 0.3620; constant per-user average baseline 0.3945; HLR 0.4694. [source] So even unfitted defaults beat naive baselines on that data. Leitner is not in the benchmark, and I could not find SM-2 rows in the current README tables (the repo still ships an SM2 runner), so there is no first-party number for either. [source for absence, as of today]
- **Caveat that matters for us** [inference]: the benchmark data is Anki free-recall flashcards self-graded on four buttons. Our Exercises are machine-graded *recognition* tasks (Choice among N, Line-Select) with a non-trivial guess rate. FSRS's default parameters and its R=0.9 target are calibrated for a different response process; its measured advantage does not automatically carry over.

## 2. Permissively licensed JS/TS libraries

Versions and licenses read from the npm registry on 2026-09-18. [source]

| Package | Algorithm | License | Latest | Runtime deps | Notes |
|---|---|---|---|---|---|
| [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs) | FSRS v6 | MIT | 5.4.2 (2026-09-01) | none | ESM/CJS/UMD. Actively maintained. Has `reschedule(card, reviews)` to rebuild card state from a review log, plus `rollback` and `forget`. Defaults: `request_retention` 0.9, `enable_fuzz` true, learning steps `1m,10m`. Parameter *optimisation* is a separate binding package, not in the core. |
| [`femto-fsrs`](https://www.npmjs.com/package/femto-fsrs) | FSRS (minimal) | MIT | 2.0.0 (2025-05) | none | about 18 KB unpacked. Not inspected beyond registry metadata. |
| [`supermemo`](https://www.npmjs.com/package/supermemo) | SM-2 | MIT | 2.0.23 (2025-03) | none | about 13 KB unpacked. npm page returned 403 to the fetcher; only registry metadata verified. |
| — | Leitner | — | — | — | Did not look for one: smaller than the glue code a dependency would need. [inference] |

Log-derived state fits all three: each is a deterministic fold over `(item, timestamp, outcome)` events. `ts-fsrs` ships that fold as `reschedule`; note its default `enable_fuzz: true` randomises intervals, which must be turned off (or seeded) for replay from the Progress Log to be reproducible. [source for the option; inference for the consequence]

## 3. Using answer time as a signal

- **None of the three uses time natively.** Anki's manual is explicit: "The time taken does not influence scheduling." [[Anki manual](https://docs.ankiweb.net/deck-options.html)] [source] The FSRS algorithm description has no time input. [source] (The benchmark's neural RWKV model does take review duration as a feature, but it is not a deployable client-side scheduler. [source])
- **But both graded algorithms already have a slot for "correct but not fluent".** SM-2's q=4 is literally "correct response after a hesitation"; FSRS's Hard is correct-with-difficulty. So the natural mapping is: wrong → Again / q≤2; correct over Time Budget → Hard / q=3; correct within budget → Good / q=5 (or 4). Never use Easy. [inference from the sources above]
- **For Leitner** the equivalent is a three-way move: wrong → demote; correct but overtime → stay in the same box; correct in time → promote. This keeps "overtime never fails" true while still feeding scheduling, as the map requires. [inference]
- **Evidence that response time is a legitimate strength signal**: Mettler, Massey & Kellman (2016), *JEP: General*, "A Comparison of Adaptive and Fixed Schedules of Practice" ([PDF](https://www.apa.org/pubs/journals/features/xge-xge0000170.pdf)). ARTS computes each item's reappearance priority "as a function of accuracy, RT, and trials since the last presentation"; slower correct answers shrink the next delay. In both experiments adaptive scheduling beat fixed expanding and equal schedules at immediate and delayed tests, and yoked controls showed the gain came from adapting to individual items and learners. [source] Caveat: ARTS is within-session sequencing of factual items, not multi-day scheduling of code reading. [source + inference]
- Practical caveat [inference]: reading time for a code snippet is dominated by snippet length, which is why a per-Exercise author-set Time Budget (already settled) is the right normaliser; use the binary over/under-budget, not raw milliseconds.

## 4. The memorisation pitfall (answer, not concept)

This is a real, documented risk, and it is the most important finding for the design.

- Pan & Rickard (2018), "Transfer of test-enhanced learning: Meta-analytic review and synthesis", *Psychological Bulletin* 144(7) ([author preprint](https://sc-pan.github.io/pdf/PR_2018W.pdf), DOI 10.1037/bul0000151): 192 effect sizes, N = 10,396. Testing does transfer overall (d = 0.40), and transfer is *greatest* "across test formats, to application and inference questions", but *weakest* "to rearranged stimulus-response items, to untested materials seen during initial study, and to problems involving worked examples". Three moderators "strongly influence" positive transfer: response congruency, **elaborated retrieval practice**, and initial test performance; after publication-bias correction the intercept often indicates "no positive transfer when none of the aforementioned moderators are present". [source]
- Reading for us [inference]: repeating an identical snippet with identical options is the low-transfer regime. A Learner can key on surface features ("the one with `&mut` twice → option B"). With only a few hundred items and N-way Choice, this happens fast. The scheduler cannot fix it; content and presentation must.
- Wozniak's [Twenty rules of formulating knowledge](https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge) pull the same way: rule 1 "Do not learn if you do not understand", and rule 17 endorses redundancy — the same knowledge approached from several angles. [source]

Mitigations, ordered by leverage [inference, grounded in the moderators above]:

1. **Schedule the concept, present a variant.** Let a Pack group Exercises as siblings testing one idea with different snippets. The Review Queue tracks the group and serves a sibling the Learner has seen least recently. This converts verbatim repetition into the across-item, application-style retrieval where transfer is strongest. It is a Pack-format decision (an optional `variantOf`/group key), so it should be raised with the Pack-format ticket.
2. **Shuffle option order on every presentation** so position cannot be memorised. Free in the engine. Authors must then avoid "both of the above" style options.
3. **Keep Rationales mandatory and show them after every review, including correct ones.** That is the "elaborated retrieval practice" moderator. Already settled in the map; this research supports it.
4. **Mix Exercise Types and Flavors across a concept** (Line-Select vs Choice is a change of test format, the category with the best transfer).
5. **Cap the top interval rather than retiring items, and treat fast-correct on a many-times-seen item as weak evidence** for Mastery. Mastery should lean on first-exposure and sibling performance more than on nth repetition of the same item.
6. Related prior art not verified in this pass: Anki buries sibling cards of the same note on the same day to stop one from priming the other ([manual, "Siblings and Burying"](https://docs.ankiweb.net/studying.html)). If sibling groups are adopted, serve at most one sibling per Session.

## 5. Comparison

| | Leitner | SM-2 | FSRS (`ts-fsrs`) |
|---|---|---|---|
| Native input | binary | 0–5 | 4 grades |
| Fit to binary + overtime | direct (3-way move) | forced mapping onto q | clean mapping Again/Hard/Good |
| Code we own | about 30 lines | about 30 lines or 13 KB dep | dependency + adapter |
| Parameters | interval table, hand-set | none fitted | 21, defaults tuned on Anki recall data; fitting needs hundreds of reviews and a separate optimiser |
| Replay from Progress Log | trivial | trivial | supported (`reschedule`), disable fuzz |
| Explainable to Learner / usable for Mastery | yes: box = visible level | weak (EF is opaque) | weak (S, D are opaque) |
| Evidence of scheduling accuracy | none first-party | none found in current benchmark | strong, but on a different task type |
| Session fit (10–15 min, few hundred items) | box intervals in days or Sessions; load easy to predict | fine | fine; default minute-scale learning steps do not suit one daily sitting |

## 6. Recommendation

**Use a Leitner variant, implemented in-house as a pure fold over the Progress Log, behind a narrow scheduler interface. Confirm the charting-time leaning.**

Concretely:

- 5 boxes with intervals of roughly 1, 2, 4, 8, 16 days (tune in the Session-composition ticket; capped top box, items never retire).
- Wrong → box 1. Correct but over Time Budget → stay. Correct within budget → up one.
- Interface: `schedule(events: AttemptEvent[], now) → { exerciseId, due, level }[]`. No stored scheduler state, so the Progress Log stays the sole source of truth and the algorithm can be swapped without migration.

Why not the others:

- **SM-2** buys nothing here. Its only extra over Leitner is the ease factor, which needs graded input we do not have; mapped from binary+overtime it is Leitner with opaque numbers.
- **FSRS** is the best *predictor* available and `ts-fsrs` is a good library (MIT, zero deps, log replay built in), so integration cost is not the objection. The objections are: its accuracy evidence comes from self-graded free recall, not machine-graded recognition with guessing; per-user fitting is unrealistic at a few hundred items and a few reviews a day; its state is unexplainable in a UI whose only gamification is Streak + Mastery; and interval precision is a second-order problem next to the memorisation pitfall in section 4.
- Because state is derived from the log, this is a cheap, reversible choice: if real Progress Logs later show Leitner over- or under-reviewing, replay the same events through `ts-fsrs` (wrong→Again, overtime→Hard, in-time→Good, fuzz off) and compare. Make sure the Progress Log records per attempt: exercise id, timestamp, correct, elapsed ms, Time Budget at the time, and chosen option — that is enough for any of the three.

**The larger recommendation is outside the scheduler**: adopt sibling/variant groups in the Pack format and shuffle options, because verbatim repetition of a small item pool is where the literature says learning stops transferring.

## Gaps

- Leitner's book and the `supermemo` npm page were not read directly (secondary source / registry metadata only).
- PubMed pages were blocked; Pan & Rickard was read from the author-hosted accepted manuscript, Mettler et al. from the APA-hosted PDF.
- No study was found that tests spaced repetition of *code-reading* multiple-choice items specifically; section 4's application to our case is inference.
