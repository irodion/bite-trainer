# What is the JSON shape of a Pack, Topic, Primer and Exercise?

Type: prototype
Status: resolved

## Question

Draft the Pack JSON format by writing 4–6 real Rust Exercises in it: at least one each of Choice/predict-output, Choice/predict-error, Choice/pick-refactor, and Line-Select, plus one Topic Primer. React to it with the user. Decide: file layout (single file vs manifest + per-Topic files), how code/snippets/markup in Rationales and Primers are represented (markdown-in-JSON?), how syntax highlighting is declared in a language-agnostic way, Flavor vocabulary (open or closed set), Time Budget field, and a JSON Schema for author tooling. Explicitly test the user's doubt: does pick-refactor really fit the Choice shape (options are themselves code blocks)? Port 2 Exercises to a second language as a universality check.

Also decide (surfaced by the spaced-repetition research): should the format support **variant groups** — sibling Exercises testing the same concept with different snippets, so the Review Queue schedules the concept and serves a different variant to stop Learners memorising answers? And may the app shuffle option order (i.e. options must not reference each other positionally)?

## Answer

Settled with the user against a drafted Rust Pack (4 Exercises, 1 Primer) and a 2-Exercise Python port; every snippet compiler- or interpreter-checked.

- **File layout:** `pack.json` manifest + one JSON file per Topic, referenced by URL relative to the manifest. Manifest: `formatVersion` (1), `id`, `version`, `title`, `description`, `language {id, name, highlight, verifiedWith}`, `license`, `attribution[]`, `flavors`, ordered `topics[] {id, title, file}`. Topic file: `id`, `title`, optional `primer {title, body[]}`, `exercises[]`.
- **Exercise, common fields:** `id`, `type` (`choice` | `line-select`), `flavor`, `timeBudget` (integer seconds, required), `prompt`, `code`, optional `focus: [from, to]` (inclusive line range to highlight), optional `explanation`.
- **Code is an array of lines**, never one string: readable diffs, and line N is element N-1.
- **Prose is restricted Markdown in strings:** paragraphs, inline code, bold, emphasis, fenced code blocks. No HTML, links or images. Primer `body` is an array of blocks.
- **Highlighting:** `language.highlight` names a grammar id for the app's highlighter; unknown ids fall back to plain text. Which highlighter is the tech-stack ticket's call.
- **Choice:** `options[]` (2–4) each with `id`, `rationale`, and either `text` or `code` (lines, max 6); exactly one `correct: true`; optional `shuffle: false`.
- **Line-Select:** `correctLines[]` (one or more; tapping any one is correct — user: "not to limit ourselves"), `rationale`, optional `lineRationales {"<line>": text}` for tempting wrong lines, required `fallbackRationale`.
- **Flavor is an open set declared per Pack** in the manifest, each with a Learner-facing label, and applies to **both** Exercise Types. The Python port forced this: "predict-error" has no compile-time meaning there and became "find the line that raises". Glossary updated.
- **pick-refactor fits Choice.** It needed only `option.code` and `focus`; no engine behaviour differs. Doubt closed.
- **Limits enforced by schema/lint:** 30 lines × 60 columns per snippet (from the Exercise screen ticket), 6 lines per code option, 2–4 options.
- **Authoring format:** authors (and drafting LLMs) write the JSON directly; the user had no strong opinion and took the agent's recommendation. The escaping cost (`\"` in code lines) is real but small, editors get autocomplete from the JSON Schema, and a friendlier source format can be layered on later without touching the Pack format.
- **Tooling shape:** two JSON Schemas (2020-12) cover structure; a separate lint covers what schema cannot (one correct option, declared flavors, line numbers inside the snippet and not blank, column limits, id uniqueness).

Assets: branch `prototype/pack-format` — `prototype/pack-format/{rust,python}/`, `schema/*.schema.json`, `lint.py` (commits ae4ae40, a1b4be1).
