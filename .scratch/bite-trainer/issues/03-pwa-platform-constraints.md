# What platform constraints bind an offline-first, install-anywhere PWA in 2026?

Type: research
Status: resolved

## Question

Surface the facts the spec depends on: iOS/iPadOS Safari PWA install flow and limits, IndexedDB/Cache storage eviction policies per browser (risk of losing the Progress Log) and navigator.storage.persist() behaviour, service-worker caching of cross-origin Pack URLs (CORS/opaque responses), desktop install support per browser, and File System / share-target options relevant to JSON export/import of progress.

## Answer

Full findings: branch `research/pwa-platform-constraints`, `docs/research/pwa-platform-constraints.md` (commit 81caaac). Sources: MDN, webkit.org, web.dev, Firefox source docs, browser-compat-data 8.1.2.

- **Install:** iOS is manual only (Share > Add to Home Screen); `beforeinstallprompt` is Chromium-only. Chrome/Edge desktop install needs a manifest (name, 192/512 icons, `start_url`, `display`), no service worker required. Firefox has no manifest-based install. The app must work fully in a plain tab.
- **Isolated storage on install:** iOS Home Screen and macOS Safari "Add to Dock" apps get storage separate from the Safari tab — progress made in a tab does not carry over. Spec needs "Import progress" on first run and an "export before installing" hint.
- **Eviction:** all browsers evict whole origins (IndexedDB + Cache together) under pressure; Safari wipes script-writable storage after 7 days of Safari use without visiting the site (installed Home Screen apps effectively exempt). Realistic risk: a Safari-tab Learner loses the entire Progress Log.
- **`navigator.storage.persist()`:** silent heuristic in Chrome/Safari, prompt in Firefox. Call after the first Session, check `persisted()`, show the result.
- **Storage:** Progress Log in IndexedDB (not localStorage/OPFS); catch `QuotaExceededError`; drop cached Packs first. Export is the safety net — "last exported" timestamp + gentle reminder.
- **Cross-origin Packs:** Pack hosts must send CORS headers; fetch with `mode: 'cors'`; never cache opaque responses. Cache Storage never expires, so the Pack format needs a version field, an update policy (stale-while-revalidate suggested), stable Exercise ids; validate a Pack before `cache.put()`.
- **Export/import baseline:** only `<a download>` + Blob and `<input type="file">` work everywhere. File pickers are Chromium-only. `navigator.share({files})` works in Safari/Chromium, gate with `canShare`. `share_target` / `file_handlers` excluded from MVP.
- **Import must merge events by id, not replace**, because tab and installed-app logs diverge. Export is one versioned JSON file.

**Unverified:** Blob download / file share inside an iOS standalone web app (needs real device); whether iOS rejects `application/json` in `navigator.share`; CORS headers of GitHub Pages / raw.githubusercontent / jsDelivr / Cloudflare Pages; EU/DMA status of Home Screen web apps; Safari's exact `persist()` heuristics.
