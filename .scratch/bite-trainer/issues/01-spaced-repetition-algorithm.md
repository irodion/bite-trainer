# Which spaced-repetition algorithm fits a small-item-count code-reading trainer?

Type: research
Status: resolved

## Question

Compare Leitner boxes, SM-2 and FSRS for our case: a few hundred Exercises per Pack, binary correct/wrong outcome plus a soft Time Budget overrun signal, state derived purely from an append-only Progress Log, client-only TypeScript. Surface: implementation complexity, available permissively-licensed JS/TS libraries, how each could use answer-time as a signal, and whether re-seeing the *same* code-reading Exercise has known memorisation pitfalls (learner memorises the answer, not the concept) and mitigations. End with a recommendation (charting-time leaning: Leitner).

## Answer

Full findings: branch `research/spaced-repetition-algorithm`, `docs/research/spaced-repetition-algorithm.md` (commit 3c5368d). No study covers spaced repetition of code-reading multiple-choice items, so applying the literature here is inference.

**Recommendation: an in-house Leitner variant.** ~5 boxes at roughly 1/2/4/8/16 days. Three-way move: wrong → box 1; correct but over Time Budget → stay; correct in time → promote. Implemented as a pure `schedule(events, now)` fold over the Progress Log with no stored scheduler state (~30 lines of TypeScript, no library). Box number doubles as a learner-visible level usable by Mastery.

- SM-2 with binary input collapses into Leitner with opaque numbers. FSRS has the best accuracy evidence, but from self-graded free recall, not machine-graded multiple choice with guessing, and needs hundreds of reviews to fit.
- Escape hatch: `ts-fsrs` (MIT, zero deps, `reschedule(card, reviews)` rebuilds state from a log; disable interval fuzz for deterministic replay). Logs can be replayed later as wrong → Again, overtime → Hard, in time → Good.
- **Progress Log must record:** exercise id, timestamp, correct, elapsed ms, Time Budget, chosen option.
- No algorithm uses answer time natively; use the binary over/under Time Budget, not raw milliseconds (Mettler, Massey & Kellman 2016 supports time + accuracy, within-session only).
- **Memorisation pitfall is real** (Pan & Rickard 2018: transfer weakest to rearranged items, depends on elaborated feedback). Mitigations: sibling/variant Exercise groups — the Review Queue schedules the concept and serves a different snippet (touches the Pack format); shuffle option order; always show Rationales; mix Choice and Line-Select; cap the top box instead of retiring items; down-weight repeat-correct answers in Mastery.
