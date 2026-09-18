# Pack identity is the declared id, not the URL

A Pack is identified by the `id` its manifest declares (reverse-domain style, e.g. `io.github.someone.rust`); the URL it was loaded from is only its current Pack Source. Every Progress Log event keys on `(packId, exerciseId)`, so a Pack can change host, be loaded from a mirror, or be removed and re-added without the Learner losing progress. When a Learner adds a URL whose manifest declares an id that is already installed from a different Pack Source, the app asks whether this is the same Pack at a new location and either replaces the Pack Source or cancels — it never merges silently.

We chose this because Pack hosts are free static hosts that authors do move between, and progress that dies with a URL would punish exactly that. The cost is that ids are self-asserted: nothing stops two authors declaring the same id, or one Pack impersonating another. We accept that because Pack content is inert (ADR 0001), so the worst outcome is muddled progress, and the confirmation prompt makes the collision visible.

## Considered Options

- **URL as identity** — spoof-proof and needs no naming rule, but a host move or mirror orphans all progress, and the same Pack loaded from two URLs becomes two Packs.
- **Declared id plus a registry or signature** — real uniqueness, but needs infrastructure a static, serverless project does not have.
