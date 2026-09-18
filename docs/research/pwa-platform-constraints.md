# PWA platform constraints for an offline-first, install-anywhere trainer (as of 2026-09-18)

Resolves: `.scratch/bite-trainer/issues/03-pwa-platform-constraints.md`

Method: primary sources only (MDN, webkit.org, web.dev / developer.chrome.com, Firefox source docs, and the MDN browser-compat-data package v8.1.2 dated 2026-09-17, read directly as JSON). Each claim is followed by its source. Things I could not verify in a primary source are listed under "Unverified" rather than asserted.

## 1. Install flow and limits

### iOS / iPadOS

- Install is manual only: Share menu -> "Add to Home Screen". There is no programmatic install prompt; `beforeinstallprompt` is not supported by Safari (BCD `api.BeforeInstallPromptEvent`: Safari/iOS `false`, Firefox `false`; Chrome 44+, Edge 79+). [web.dev Learn PWA: Installation](https://web.dev/learn/pwa/installation), [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- Since iOS/iPadOS 16.4, third-party browsers (Chrome, Edge, Firefox, Orion) can also offer Add to Home Screen from their Share menu. [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [MDN installable guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- iOS 26 / iPadOS 26: "By default, every website added to the Home Screen opens as a web app", with an "Open as Web App" toggle the user can turn off. "There are now zero requirements for 'installability' in Safari" - no manifest needed, though a manifest still customises name, icon, display, start URL. [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- Only `standalone` display mode is supported; no badging or app shortcuts; supply an `apple-touch-icon` or the icon is a page screenshot. [web.dev Learn PWA: Installation](https://web.dev/learn/pwa/installation)
- The same web app can be installed multiple times; each install is identified by manifest `id` + user-chosen name, and each install "has its own isolated storage, and it will be treated as a different app". [WebKit 16.4 post](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [web.dev Installation](https://web.dev/learn/pwa/installation)
  - Consequence: progress made in a Safari tab does not appear in the Home Screen app, and vice versa.

### macOS Safari

- Safari 17 (macOS Sonoma)+: File -> "Add to Dock" works for any site, manifest optional. At install Safari copies the site's cookies into the web app; "does not copy over any other kind of local storage", and afterwards no website data is shared with Safari. [WebKit Features in Safari 17.0](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
  - Same consequence as iOS: IndexedDB progress is not carried into the Dock app.
- Note: web.dev's Installation page still says Safari on macOS cannot install; the WebKit post and MDN supersede it.

### Desktop Chrome / Edge

- Full install support on Windows, macOS, Linux, ChromeOS. Chromium install criteria: HTTPS (or localhost), manifest with `name` or `short_name`, `icons` incl. 192px and 512px, `start_url`, `display`/`display_override`, and `prefer_related_applications` not `true`. A service worker is NOT required for installability. `beforeinstallprompt` enables a custom install button. [MDN installable guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

### Desktop Firefox

- No manifest-based PWA install. [MDN installable guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- Firefox 143+ on Windows has "web apps" (taskbar tabs): "Add tab to taskbar" button in the URL bar; enabled by default on Windows, disabled by default on Linux, unavailable on macOS. They run in the same profile as the main browser ("same access, controls, and add-ons as a normal tab"), so storage is shared with normal Firefox tabs. [Mozilla Support: Use web apps in Firefox for Windows](https://support.mozilla.org/en-US/kb/web-apps-firefox-windows), [Firefox Source Docs: Web Apps](https://firefox-source-docs.mozilla.org/browser/components/taskbartabs/docs/index.html)

### Android

- Chrome (with Google Mobile Services) and Samsung Internet install as WebAPKs (single install). Firefox, Edge, Opera, Brave create home-screen shortcuts that share the browser's storage. [web.dev Installation](https://web.dev/learn/pwa/installation), [MDN installable guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

## 2. Storage quotas, eviction, and `navigator.storage.persist()`

Quota is not the binding constraint (a Progress Log is kilobytes to low megabytes); eviction is.

- Quotas: Chromium up to 60% of disk per origin; Firefox best-effort min(10% disk, 10 GiB) per eTLD+1 group, persistent up to 50% disk; Safari 17+ ~60% of disk per origin for browser apps and Home Screen / Dock web apps, 80% overall. [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- Default is best-effort. Under storage pressure or when the browser-wide limit is exceeded, all browsers evict whole origins in least-recently-used order, skipping origins granted persistence. Eviction is all-or-nothing per origin: "all of its data, not parts of it, is deleted at the same time" - IndexedDB and Cache Storage go together. [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Safari's proactive 7-day cap: with cross-site tracking prevention on (the default), Safari deletes "all of a website's script-writable storage after seven days of Safari use without user interaction on the site" - IndexedDB, LocalStorage, SessionStorage, service worker registrations and caches. The counter counts days of Safari use, and resets on user interaction with the site. [WebKit: Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
  - Home Screen web apps "are not part of Safari and thus have their own counter of days of use. Their days of use will match actual use of the web application which resets the timer"; WebKit says deletion of first-party data in a Home Screen web app should be reported as a serious bug. web.dev summarises this as installed PWAs being exempt. [same WebKit post](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/), [web.dev: Storage for the web](https://web.dev/articles/storage-for-the-web)
  - So the realistic loss scenario is: a Learner using the app in a Safari tab (not installed), who uses Safari on 7 days without touching the app - i.e. exactly a broken Streak - loses the whole Progress Log and the offline cache.
- `navigator.storage.persist()` (Chrome 55+, Firefox 57+, Safari 15.2+; `estimate()` Safari 17+ - BCD):
  - Chrome/Edge: no prompt; auto-granted or denied from heuristics - site engagement, installed or bookmarked, notification permission. [web.dev: Persistent storage](https://web.dev/articles/persistent-storage)
  - Firefox: shows a user permission popup. [web.dev persistent storage](https://web.dev/articles/persistent-storage), [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
  - Safari: no prompt; heuristic, including "whether the website is opened as a Home Screen Web App". [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
  - Persistence protects IndexedDB, Cache API, service workers, localStorage, OPFS from automatic eviction only. It can be denied silently, so the result must be checked (`persisted()`), and it never protects against the user clearing site data or uninstalling.
- Recommended stores: Cache Storage for app/Pack resources, IndexedDB for structured data, OPFS for files; all three throw `QuotaExceededError` that must be caught. localStorage is capped at ~5 MiB and is synchronous. [web.dev: Storage for the web](https://web.dev/articles/storage-for-the-web), [MDN storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

## 3. Service-worker caching of cross-origin Pack URLs

- A cross-origin `fetch()` in `no-cors` mode yields an opaque response: status reads as 0, body and headers are unreadable from JS. The app must parse Pack JSON, so opaque responses are useless for Packs regardless of caching - Pack hosts MUST send CORS headers (`Access-Control-Allow-Origin`) and the app must fetch in `cors` mode. [Chrome/Workbox: Caching resources during runtime](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime), [MDN: Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- Caching opaque responses is additionally hazardous: an error page can be cached undetectably and served forever under cache-first, and Chrome pads each opaque response to roughly 7 MB of quota. Workbox refuses to cache them by default. [Workbox doc above](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime)
- With a CORS response, the response is fully inspectable: check `response.ok` and validate the JSON before `cache.put()`. `cache.add()/addAll()` are fetch+put conveniences; explicit `put()` after validation is the pattern MDN demonstrates. [MDN: Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- Cache Storage entries "don't expire unless deleted" and "the caching API doesn't honor HTTP caching headers" - Pack update policy (versioning, stale-while-revalidate, explicit refresh) is entirely the app's job. [MDN: Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- Cached Packs live in the same origin bucket as the Progress Log, so they are evicted together (section 2). Packs are re-downloadable; the log is not.
- GitHub Pages / raw.githubusercontent and Cloudflare Pages CORS defaults were not verified here - see Unverified.

## 4. Export / import of the Progress Log

Support per MDN browser-compat-data 8.1.2 (2026-09-17):

| Mechanism | Chrome/Edge desktop | Chrome Android | Firefox | Safari macOS / iOS |
|---|---|---|---|---|
| `<a download>` + Blob URL (export) | yes | yes | yes | yes (10.1 / 10.3) |
| `<input type="file">` (import) | yes | yes | yes | yes |
| `showSaveFilePicker` / `showOpenFilePicker` | 86 | 132 | no | no |
| `navigator.share()` | 128 (Edge 93) | 61 | 71 / Android 79 | 12.1 / 12.2 |
| `navigator.share({files})` | 89 / Edge 81 | 76 | no | 14 |
| manifest `share_target` | 89 | 76 | no (Android parses, no effect) | no ([WebKit bug 194593](https://webkit.org/b/194593)) |
| manifest `file_handlers` + `LaunchQueue` | 102 | no | no | no |
| OPFS `navigator.storage.getDirectory()` | 86 | 109 | 111 | 15.2 |

- Only `<a download>` and `<input type="file">` are universal. Chrome's own guidance is to treat the File System Access pickers as a progressive enhancement with exactly that fallback (e.g. the browser-fs-access library). Pickers need HTTPS and transient user activation. [Chrome: File System Access API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access), [MDN: showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)
- Web Share with files: MDN's list of shareable file types includes text types `.txt`, `.html`, `.csv`, `.css` and `application/pdf`, but NOT `.json` / `application/json`. Sharing the export as JSON may be rejected; `navigator.canShare({files})` must gate it, and a `.txt` (text/plain) wrapper is the listed-safe form. Needs HTTPS + transient activation. [MDN: Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- `share_target` (receiving a file into the app) is experimental, Chromium-only, requires an installed PWA, and needs `POST` + `multipart/form-data` handled by the service worker. Not usable on iOS, where it would matter most. [MDN: share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target)
- OPFS is universal but origin-private and "not intended that the contents be user accessible"; it is evicted with the origin, so it is not a backup location. [Chrome FSA doc](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)

## Unverified (not found in a primary source during this pass)

- Behaviour of `<a download>` with Blob URLs specifically inside an iOS standalone Home Screen web app (historically flaky). BCD marks the attribute supported; needs a real-device check during build.
- Whether `navigator.share` actually rejects `application/json` files on iOS Safari (MDN's allow-list is documented from Chromium). Device check needed.
- CORS headers served by GitHub Pages, raw.githubusercontent.com, jsDelivr, Cloudflare Pages for third-party Pack hosting. Belongs with the "Third-party Pack trust & discovery" item.
- Current status of Home Screen web apps in the EU under the DMA: Apple's DMA page does not mention them.
- Exact Safari `persist()` heuristics beyond "opened as a Home Screen Web App".

## Implications for the spec

1. **Treat local storage as losable; export is the safety net, not a nicety.** Spec a "last exported" timestamp and a non-nagging backup reminder (e.g. after N Sessions since last export). This is justified by origin-wide LRU eviction everywhere and Safari's 7-day cap.
2. **Call `navigator.storage.persist()`**, after a meaningful user gesture (e.g. finishing the first Session, which in Firefox makes the prompt intelligible), then read `persisted()` and surface the result in a settings/"data safety" view. Never assume it was granted.
3. **On Safari-in-a-tab, push installation explicitly.** Detect non-standalone iOS/macOS Safari and show a one-time explainer ("Add to Home Screen / Add to Dock so your progress is not cleared after a week away"). Installed web apps escape the 7-day cap and are favoured by `persist()` heuristics in both Safari and Chrome.
4. **Install, then start - and offer import on first run.** iOS and macOS installs get fresh isolated storage (only cookies are copied on macOS). The first-run screen of an empty install must offer "Import progress"; the install explainer should tell Learners with existing tab progress to export first.
5. **Install UX is per-platform:** custom install button via `beforeinstallprompt` on Chromium only; static instructions for iOS/macOS Safari; Firefox desktop gets no install affordance (Windows taskbar-tab is user-driven and shares the normal profile). The app must be fully functional uninstalled in a tab.
6. **Manifest:** ship `name`, `short_name`, 192 + 512 icons, `start_url`, `display: standalone`, and a stable `id`; add `apple-touch-icon`. Do not design anything around non-`standalone` display modes, badging, or shortcuts.
7. **Packs require CORS - make it a Pack format rule.** "A Pack URL must be served with `Access-Control-Allow-Origin` permitting the app origin (or `*`)". Fetch with `mode: 'cors'`, never `no-cors`; on CORS failure show an author-actionable error. Never cache opaque responses.
8. **Pack caching is app-managed:** validate (`response.ok` + schema) before `cache.put()`; Cache Storage never expires, so the Pack format needs a version field and the spec needs an update policy (suggest stale-while-revalidate with the Progress Log keyed by stable Exercise ids so a Pack refresh cannot orphan history). The official Rust Pack is same-origin and can be precached with the app shell.
9. **Keep the Progress Log in IndexedDB**, not localStorage (5 MiB, synchronous) and not OPFS (no advantage, same eviction). Catch `QuotaExceededError` on every write. Since Packs and the log share one eviction bucket, re-downloadable Pack data should be the first thing the app itself drops under quota pressure.
10. **Export/import baseline = `<a download>` Blob + `<input type="file" accept=".json,application/json">`.** That is the only combination that works on every target. Optional progressive enhancements, in order of value: `showSaveFilePicker` on Chromium; `navigator.share({files})` on iOS/Android gated by `canShare` (with a text/plain fallback because JSON is not on the documented allow-list). Explicitly exclude `share_target` and `file_handlers` from the MVP: Chromium-only, and absent on iOS.
11. **Export format should be a single self-describing JSON file** (format version + the append-only log), and import should be a merge of events by id rather than a replace, because the isolated-storage facts above mean Learners will routinely end up with two diverged logs (tab vs installed app). This also keeps the door open for later sync.
12. **Flag for the build phase:** real-device verification of Blob download and file share inside an iOS standalone web app (see Unverified).
