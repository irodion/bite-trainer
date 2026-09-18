# What events make up the Progress Log, and how do export/import work?

Type: grilling
Status: open
Blocked by: 01, 07

## Question

Design the append-only Progress Log: event types and fields (attempt, answer chosen, elapsed time vs Time Budget, Pack/Exercise ids and versions, device id?), how Review Queue, Mastery and Streak are derived from it, the JSON export format, and import semantics (merge vs replace, duplicate events) — shaped so a future sync effort can merge logs from multiple instances without a server.

Inputs from research: the log must record exercise id, timestamp, correct, elapsed ms, Time Budget, chosen option (spaced-repetition ticket). Import must merge events by id, not replace, because Safari-tab and installed-app storage are isolated and diverge; export is one versioned JSON file; spec a 'last exported' reminder and `navigator.storage.persist()` after the first Session (PWA platform ticket).
