# Context

A browser-first, offline-capable trainer where programmers build language fluency by *reading* code in short daily sittings, not typing it.

## Glossary

- **Learner** — the person using the app. Already programs (in another language, or in the Pack's language); never a programming beginner.
- **Pack** — a distributable content unit for one programming language, loadable from any URL. Contains Topics.
- **Topic** — an ordered unit inside a Pack (e.g. "ownership"). Contains a Primer and Exercises.
- **Primer** — the short Topic-level lesson card a Learner can read before the Topic's Exercises.
- **Exercise** — one question: a code snippet, a prompt, and a correct answer. Never requires typing code.
- **Exercise Type** — the interaction primitive of an Exercise. Exactly two: **Choice** (pick one of N options) and **Line-Select** (tap a line of the snippet; an Exercise may accept several lines).
- **Flavor** — an authoring tag on an Exercise, of either Exercise Type, describing what is being asked (e.g. predict-output, predict-error, pick-refactor, find-the-line). An open set: each Pack declares its own Flavors with Learner-facing labels. Drives labels and stats, not engine behaviour.
- **Rationale** — the authored text attached to each option explaining why it is right or wrong.
- **Explanation** — everything shown after answering: the Rationales plus any Exercise-level text.
- **Time Budget** — the author-set expected answering time for an Exercise. Soft: overtime is recorded, never fails the Exercise.
- **Session** — one daily sitting of roughly 10–15 minutes.
- **Review Queue** — the Exercises currently due for spaced repetition.
- **Progress Log** — the append-only event log of a Learner's attempts; the sole source of progress state.
- **Mastery** — per-Topic measure of how well a Learner knows the Topic, derived from the Progress Log.
- **Streak** — count of consecutive days with a completed Session.
