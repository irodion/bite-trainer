# What author-time verification must a Pack pass, and how much of it does the MVP spec include?

Type: grilling
Status: open

## Question

The Pack format prototype produced two layers of checking: JSON Schema (structure) and a lint (cross-field rules: one correct option, declared Flavors, line numbers inside the snippet, 30×60 limits, id uniqueness). A third layer is only sketched: proving an Exercise's *claim* — that the snippet really prints what the correct option says, or really fails with the stated error on a `correctLines` line — by running the language toolchain (`language.verifiedWith`). Decide: which layers the MVP spec requires; whether claim-verification is generic (a per-language runner contract) or Rust-only for now; whether an Exercise needs extra machine-readable fields for it (expected stdout, expected error code); where it runs (CI on Pack PRs?); and what third-party Pack authors are expected to run.

Input from the tech stack ticket: the schema + lint layers are one TypeScript implementation in the app's `core/`, shared by the in-app pre-cache validation and the author-time CLI; Pack schemas are restricted to the draft-07-compatible subset of JSON Schema.

Input from the Pack identity ticket: lint also checks the reverse-domain Pack `id` pattern, Pack-wide uniqueness of Exercise and Topic ids, and (in CI, against the base branch) that content changes come with a changed `version`; ideally it also warns when an Exercise keeps its id but its correct answer changed. The CLI rejects unknown fields while the app ignores them — same schema, `additionalProperties` toggled by mode.
