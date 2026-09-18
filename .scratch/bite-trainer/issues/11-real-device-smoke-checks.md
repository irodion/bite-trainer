# Do the phone-only assumptions hold on real devices?

Type: task
Status: open

## Question

Several decisions rest on behaviour nobody has seen on real hardware. Before spec assembly, check them (HITL — the agent prepares a throwaway test page and a checklist; the human runs it on a real iPhone and an Android phone) and record the facts:

- iOS, both in a Safari tab and as a Home Screen app: does `<a download>` + Blob save a JSON file? Does `navigator.share({files})` accept `application/json` (or does it need `text/plain`)? Does `<input type="file">` read it back?
- Exercise screen prototype (https://claude.ai/artifact/XqGUts7ymP2MLVUTARL4kT) on a real phone: is 13px code legible, and are Line-Select gutter taps accurate at line-height ~2.1?
- "Explain more": do the Claude / ChatGPT prefill links and the Web Share path behave as the deep-link ticket assumed, with the app installed and not installed?
- CORS headers actually sent by candidate third-party Pack hosts (GitHub Pages, raw.githubusercontent, jsDelivr, Cloudflare) — the agent can do this part alone with `curl`.

The answer records what failed, and which resolved tickets need amending.
