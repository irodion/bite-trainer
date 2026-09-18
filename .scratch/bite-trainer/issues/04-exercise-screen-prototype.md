# What does an Exercise screen look like at phone width, and what snippet limits follow?

Type: prototype
Status: resolved

## Question

Reading 20–40 line snippets on a phone is the core UX risk. Prototype the Exercise screen (Choice and Line-Select, soft Time Budget indicator, post-answer Rationales, Primer access, deep-link 'explain more') at phone, tablet and desktop widths with real Rust snippets. Decide from it: hard authoring limits (max lines, max columns), wrap vs horizontal scroll, font sizing, how Line-Select tap targets work, where options sit relative to code.

## Answer

Settled with the user against a three-variant prototype (A one scrolling page, B pinned code + answer sheet, C two panes + letter keys).

- **Layout: variant B plus the letter keys from C.** The code pane fills the screen and never scrolls out of view; the prompt, options, Rationales, Primer link and "explain more" live in a bottom sheet that can be collapsed. A row of A–D keys stays pinned under the code so a Choice can be answered without opening the sheet. A was judged the conservative option and rejected: on a phone the code scrolls away while the options are read. At ≥900px the sheet stays docked at the bottom with options in a grid.
- **Answering: select, then Check.** No one-tap commit — a mis-tap would write a wrong attempt into the Progress Log.
- **Code rendering: horizontal scroll, never wrap**, 13px monospace default, line numbers in a sticky gutter, ligatures off. Learner-adjustable font size is cheap and worth keeping.
- **Hard authoring limits: max 30 lines, max 60 columns per snippet.** A 375px phone fits about 40 columns at 13px, so 60 means only occasional sideways scrolling. Options that are code blocks (pick-refactor) render fine in the sheet at 2–3 lines; they need their own, tighter limit — left to the Pack format ticket.
- **Line-Select: tap targets are the line-number gutter, with taller rows (line-height ~2.1) while a line is pickable**; the selected line is then confirmed with Check. Follows from choosing B; not yet verified on a real device.
- **Time Budget indicator:** small ring in the sheet header, filling to the budget and turning amber on overtime; after answering, "0:52 · 7s over budget" as quiet text. Never blocks.

Assets: prototype source on branch `prototype/exercise-screen` (`prototype/exercise-screen.html`, commit b39166d); hosted copy https://claude.ai/artifact/XqGUts7ymP2MLVUTARL4kT. Verified only in desktop Chrome at simulated 375 / 768 / 1180 px widths.
