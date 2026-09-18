# How are Packs and Exercises identified and versioned so progress survives Pack updates?

Type: grilling
Status: resolved
Blocked by: 05

## Question

Packs load from arbitrary URLs and evolve. Decide: Pack identity (URL vs declared id), Exercise ids (author-assigned, stable), Pack version semantics, what happens to Progress Log entries when an Exercise is edited, reordered, or deleted, format-version negotiation between app and Pack, and update/caching behaviour offline.

Inputs from the PWA platform research: Cache Storage never expires, so Packs need a version field and an update policy (stale-while-revalidate suggested); Pack hosts must send CORS headers; validate a Pack before caching it.

## Answer

Settled with the user over two grilling rounds; they accepted every recommendation. ADR: `docs/adr/0002-pack-identity-is-the-declared-id.md`. Glossary gained **Pack Source**.

**Identity**
- **A Pack is its declared `id`**, reverse-domain style (`io.github.someone.rust`), pattern-checked by lint, no registry. The URL is only the current **Pack Source**. Host moves, mirrors and remove/re-add keep progress.
- **Id collision:** adding a URL whose manifest declares an already-installed `id` from a different Pack Source prompts "Same Pack, new location?" → replace the Pack Source, or cancel. Never a silent merge.
- **Exercise ids are unique across the whole Pack**, author-assigned readable slugs (`own-move-03`), never derived from position or content. Topic ids likewise Pack-unique and stable. **Progress key = `(packId, exerciseId)`** — Topic and position are not part of it, so reordering or moving an Exercise between Topics is free. Lint rejects duplicates Pack-wide.

**Versions and edits**
- **Pack `version` is an opaque string**, compared for equality only ("did it change?"), shown to the Learner, stamped on every Progress Log event. No semver logic. CI lint fails a Pack PR that changes content without changing `version`.
- **Same id = same Exercise, always.** Authoring rule: typo / wording / Rationale fixes keep the id; changing the snippet's behaviour, the correct answer, or what is asked means a new id (the old one is just deleted). No per-Exercise `rev`, no content hashing. Choice option ids must stay stable under edits too; a logged option id that no longer exists still counts as recorded.
- **Deleted Exercises / Topics:** their log events stay forever (append-only, included in exports); folds ignore orphans — never in the Review Queue, Mastery computed over the Exercises a Topic has *now*, Streak untouched. If the id reappears its history is live again. No tombstones, no `replaces:` migration maps in MVP.
- **`formatVersion`:** one integer, bumped only on breaking changes. The app carries validators for every version ≤ its own; a higher one is refused with "needs a newer app version" and any cached older copy keeps working. Within a version the **app ignores unknown fields** (safe under ADR 0001), the **author-time CLI rejects them** — one schema, `additionalProperties` toggled by mode.

**Update and caching**
- **Stale-while-revalidate:** always start from cache; on app start, when online, re-fetch `pack.json` with `cache: 'no-cache'`. A new version is **never swapped in mid-Session** — it activates at the next Session start or app start. Quiet "Updated to version X" line on the Pack screen, plus a manual "Check now". Offline / fetch errors are silent.
- **A Pack version is atomic:** new manifest → if `version` differs, fetch *all* Topic files → validate the whole set (schema + lint) → write to a cache bucket keyed `packId + version` → flip a "current version" pointer in IndexedDB → delete the old bucket. Any failure (network, validation, higher `formatVersion`) discards the download, keeps the old version, and the Pack screen shows why. Consequence: Topic files are fetched eagerly; a Pack is fully offline after first load.
- **No per-file hashes or versions** in the manifest; a `version` change re-downloads every Topic file. Revisit only if Packs ever carry assets.
- **The official Rust Pack is not special:** a default entry in app config with a relative URL, same fetch → validate → cache path, not precached with the shell. First run fetches it immediately with progress shown; the app only claims "ready offline" once a Pack is cached.
- **Removing a Pack** deletes its cache bucket and Pack Source entry; Progress Log events stay, and re-adding the same `id` from any URL restores progress (the dialog says so). "Erase my progress for this Pack" is not in this ticket — handed to the Progress Log ticket.
