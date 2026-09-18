# How are Packs and Exercises identified and versioned so progress survives Pack updates?

Type: grilling
Status: open
Blocked by: 05

## Question

Packs load from arbitrary URLs and evolve. Decide: Pack identity (URL vs declared id), Exercise ids (author-assigned, stable), Pack version semantics, what happens to Progress Log entries when an Exercise is edited, reordered, or deleted, format-version negotiation between app and Pack, and update/caching behaviour offline.

Inputs from the PWA platform research: Cache Storage never expires, so Packs need a version field and an update policy (stale-while-revalidate suggested); Pack hosts must send CORS headers; validate a Pack before caching it.
