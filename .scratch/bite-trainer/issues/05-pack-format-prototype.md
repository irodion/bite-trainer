# What is the JSON shape of a Pack, Topic, Primer and Exercise?

Type: prototype
Status: open

## Question

Draft the Pack JSON format by writing 4–6 real Rust Exercises in it: at least one each of Choice/predict-output, Choice/predict-error, Choice/pick-refactor, and Line-Select, plus one Topic Primer. React to it with the user. Decide: file layout (single file vs manifest + per-Topic files), how code/snippets/markup in Rationales and Primers are represented (markdown-in-JSON?), how syntax highlighting is declared in a language-agnostic way, Flavor vocabulary (open or closed set), Time Budget field, and a JSON Schema for author tooling. Explicitly test the user's doubt: does pick-refactor really fit the Choice shape (options are themselves code blocks)? Port 2 Exercises to a second language as a universality check.

Also decide (surfaced by the spaced-repetition research): should the format support **variant groups** — sibling Exercises testing the same concept with different snippets, so the Review Queue schedules the concept and serves a different variant to stop Learners memorising answers? And may the app shuffle option order (i.e. options must not reference each other positionally)?
