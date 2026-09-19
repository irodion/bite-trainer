# What is in a Session, when does it count as completed, and how is Mastery derived?

Type: grilling
Status: open

## Question

Decide, at the level a Learner can observe: how a Session mixes new Exercises from the Topic path with due Review Queue items to land in 10–15 minutes; what the Learner must do for the Session to count as completed (the moment a `session-completed` event is written, which is all Streak counts); what happens on a day with nothing due or no new Exercises left; and what Topic Mastery shows and roughly what moves it (Leitner box as input, overtime weighing in, repeat-correct answers weighing less).

Keep it to the rules the spec must state. Exact weights and thresholds are agent-chosen defaults, revisable at build time — do not grill the user on them.

Inputs: 5-box Leitner fold (spaced-repetition ticket); three event types and pure folds (Progress Log ticket).

## Comments

**2026-09-19 — built so far (ticket stays open for Session length and the Mastery formula, which wait on real usage data from the user's Progress Log).**

- **Leaving halfway:** a ✕ in the sheet's header row (never over the code) leaves the Session; every answer given is kept. No confirmation — nothing is lost.
- **Continuing:** an unfinished Session is *derived from the Progress Log* (`unfinishedSession`): the most recent Session with attempts, no `session-completed`, started on the current local day, not erased by a `reset`. No new stored state, so it survives reloads and travels with export/import. Home shows "Continue Session · N left"; continuing keeps the same Session id and only offers what is left of the Time Budget. A Session abandoned on an earlier day is not offered again, and earns no Streak day.
- **End of Session:** "Session complete" screen — answered, correct, over budget, missed (listed by Topic), minutes of reading, Streak. `summarize` is a pure fold.
- **After completing:** home says "Done for today" and offers a quiet "Practice more" instead of a full-strength Start button. Found by the e2e test: with 48 Exercises the home screen simply offered another Session, which contradicts the 10–15 min/day idea.
- Position counter continues across the break (e.g. 3/9, not 1/7).
