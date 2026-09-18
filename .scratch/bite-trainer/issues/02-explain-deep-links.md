# Can a static PWA hand an Exercise to Claude/ChatGPT via a prefilled deep link?

Type: research
Status: resolved

## Question

Establish the facts for the 'open in Claude / ChatGPT' explanation feature: which assistants support a URL with a prefilled prompt (claude.ai, chatgpt.com, others), exact URL shapes, length limits, behaviour on mobile (app vs browser hand-off, installed PWA context), and stability/officialness of each. Also note the Web Share API as a fallback. Briefly cover what a BYO-API-key or localhost-bridge (Ollama, local CLI) alternative would require from a static PWA (CORS, mixed content, key storage) so the fog item 'Ask AI beyond deep links' can be judged.

## Answer

Desk research only — no link was tested live. Full findings: `docs/research/explain-deep-links.md`.

- No assistant officially documents an https URL that prefills a chat. `https://claude.ai/new?q=…` and `https://chatgpt.com/?prompt=…` (or `?q=`) are de-facto conventions; the Claude one reportedly broke around Oct 2025 and works again per 2026 sources. Never assume auto-submit. Official Claude prompt links are `claude://` schemes (desktop, ~14k char truncation); custom schemes fail silently when the app is absent, so only `https://` is safe.
- Gemini has no prefill URL. Perplexity uses `perplexity.ai/search/?q=`.
- The app cannot detect whether the prompt arrived. Web Share API (`navigator.share`) is the best mobile path: no length limit, covers every installed assistant, needs HTTPS + user gesture.
- BYO API key is feasible from a static page (Anthropic `anthropic-dangerous-direct-browser-access` header, OpenAI `dangerouslyAllowBrowser`) but puts a key in browser storage, tying it to Pack-content sanitising. Localhost/Ollama needs `OLLAMA_ORIGINS`, hits Chrome's Local Network Access prompt, reportedly blocked in Safari, impossible on mobile.

**Recommendation:** a "Copy prompt + open" control — write the prompt to the clipboard, then open the Claude/ChatGPT https link; offer Share… first on mobile. Targets live in an app-side config table (URL template + max length), not in the Pack format. Cap the encoded prompt at ~6,000 chars with a deterministic trim order. Spec includes a manual smoke-test matrix (desktop / iOS / Android / installed PWA, app present or absent). "Ask AI beyond deep links" stays out of MVP; if revisited, BYO key before localhost bridge.
