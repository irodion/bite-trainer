# What is in a Session, when does it count as completed, and how is Mastery derived?

Type: grilling
Status: open

## Question

Decide, at the level a Learner can observe: how a Session mixes new Exercises from the Topic path with due Review Queue items to land in 10–15 minutes; what the Learner must do for the Session to count as completed (the moment a `session-completed` event is written, which is all Streak counts); what happens on a day with nothing due or no new Exercises left; and what Topic Mastery shows and roughly what moves it (Leitner box as input, overtime weighing in, repeat-correct answers weighing less).

Keep it to the rules the spec must state. Exact weights and thresholds are agent-chosen defaults, revisable at build time — do not grill the user on them.

Inputs: 5-box Leitner fold (spaced-repetition ticket); three event types and pure folds (Progress Log ticket).
