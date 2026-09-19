# What events make up the Progress Log, and how do export/import work?

Type: grilling
Status: resolved
Blocked by: 01, 07

## Question

Design the append-only Progress Log: event types and fields (attempt, answer chosen, elapsed time vs Time Budget, Pack/Exercise ids and versions, device id?), how Review Queue, Mastery and Streak are derived from it, the JSON export format, and import semantics (merge vs replace, duplicate events) — shaped so a future sync effort can merge logs from multiple instances without a server.

Inputs from research: the log must record exercise id, timestamp, correct, elapsed ms, Time Budget, chosen option (spaced-repetition ticket). Import must merge events by id, not replace, because Safari-tab and installed-app storage are isolated and diverge; export is one versioned JSON file; spec a 'last exported' reminder and `navigator.storage.persist()` after the first Session (PWA platform ticket).

Inputs from the Pack identity ticket: events key on `(packId, exerciseId)` and carry the Pack `version` string and, for Choice, the option id; folds must ignore events whose Exercise is absent from the currently loaded Pack (and revive them if it returns); removing a Pack leaves its events in place. Open here: whether the MVP offers "erase my progress for this Pack", which an append-only log can only do with a tombstone/reset event.

## Answer

The user accepted the agent's proposals wholesale and flagged that the grilling went deeper than this stage warrants. So the answer is split: what the spec must fix, and defaults the build agent may revise.

**Decisions the spec fixes**
- **Three event types:** `attempt`, `session-completed`, `reset`. Nothing else is logged in MVP.
- **`attempt` stores the verdict as judged at the time** (`correct`) alongside the chosen answer, elapsed time, Time Budget, `(packId, exerciseId)`, Pack `version` and a `sessionId`. History is never re-judged against a newer Pack.
- **Streak counts explicit `session-completed` events**, not a rule over attempts, so tuning the completion rule never rewrites past days. The day is the Learner's local date when the event was written.
- **Every event has a random unique id and the id of the Instance that wrote it.** Import is a set union by event id — never replace. This is what makes future serverless sync a merge.
- **"Erase my progress for this Pack" is in MVP** as a `reset {packId}` event: folds ignore that Pack's earlier attempts; it survives merges; Streak is untouched.
- **Export = the whole log in one versioned JSON file, plus the list of installed Packs (id + Pack Source)** so importing into a fresh Instance can offer to re-add them. Settings do not travel.
- **Import is tolerant of unknown event types (kept and re-exported, skipped by folds), strict about everything else** (malformed or newer-format file → rejected whole, nothing written).
- **No persisted derived state:** Review Queue, Mastery and Streak are pure folds in `core/`, recomputed from the log at startup and after import.

**Defaults — build agent may change without reopening this ticket**
- Ids via `crypto.randomUUID()`; time as UTC epoch ms + `tzOffsetMin`; folds order by `(at, id)`; clock skew accepted.
- `elapsedMs` counts page-visible time only, uncapped; overtime derived, not stored.
- Envelope `{format, formatVersion: 1, exportedAt, instanceId, packs[], events[]}`, file `progress-YYYY-MM-DD.json`, via `<a download>` or `navigator.share` where `canShare` allows.
- IndexedDB stores: `events` and a small `meta` (instance id, installed Packs, settings, last-exported). Import in one transaction, then a "N new / M already present / K Packs to add" summary.
- Export reminder: quiet dismissible home-screen line after ≥7 days and ≥1 completed Session since last export, or once when `persist()` returns false.

Glossary gained **Instance**; **Progress Log** widened beyond attempts. No ADR: event-sourcing was fixed at charting, the rest is reversible behind `formatVersion`.

## Comments

**2026-09-19 — amended after code review (sec-2 / qa-4).** Two defaults above changed:
- "Events dated in the future are kept" → on **import**, a file containing an event more than 48 hours ahead of the importing device's clock is refused whole (a well-formed far-future `reset` would hide all progress). Events this device wrote itself are exempt.
- "Malformed event → file rejected whole" is now implemented and tested (`core/progressLog.ts`); additionally, stored records that do not parse are quarantined on read rather than folded.
