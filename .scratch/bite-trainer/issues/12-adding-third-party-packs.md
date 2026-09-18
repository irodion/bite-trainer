# How does a Learner find and add a third-party Pack, and what does the app show before loading it?

Type: grilling
Status: open

## Question

Packs load from any URL. Decide the add-a-Pack flow for the MVP spec: how a URL gets in (paste field, `?pack=<url>` share link, both), what the app shows about an unofficial Pack before and after fetching it (declared id, title, version, license, attribution, host, "unofficial" marking), how fetch / CORS / validation / `formatVersion` failures are worded, whether the Learner can have several Packs installed and how they switch between them, and whether the MVP has any Pack directory (a static list in the repo, contributed by PR) or none.

Already settled — do not reopen: Pack content is inert ([ADR 0001](../../../docs/adr/0001-pack-content-is-never-rendered-as-html.md)); a Pack is its declared id and the URL is only its Pack Source, with a "Same Pack, new location?" prompt on id collision ([ADR 0002](../../../docs/adr/0002-pack-identity-is-the-declared-id.md)); Packs are validated whole before caching and removing one keeps its progress (Pack identity ticket); the official Rust Pack is just a default config entry on the same path.
