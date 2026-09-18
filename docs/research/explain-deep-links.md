# Research: handing an Exercise to Claude/ChatGPT via a prefilled deep link

Ticket: `.scratch/bite-trainer/issues/02-explain-deep-links.md`
Researched: 2026-09-18. Confidence markers: **[official]** = first-party documentation; **[de-facto]** = undocumented by the vendor but observable in first-party behaviour and in widely used open-source code; **[community]** = forum/user reports only.

## TL;DR

- No chat assistant officially documents a *web* "open a new chat with this prompt" URL. The `?q=` links everyone uses are de-facto conventions. The only officially documented prompt deep links are Anthropic's `claude://` schemes (desktop app chat; mobile/desktop Claude Code), which prefill but never auto-submit.
- The de-facto web URLs (`https://claude.ai/new?q=…`, `https://chatgpt.com/?prompt=…` / `?q=…`) are used by mainstream tooling (Vercel AI Elements, Mintlify), so they are "stable enough to ship, not stable enough to depend on". They have broken before (claude.ai, Oct 2025).
- Therefore the feature must be built as **copy-prompt-first, deep link second**: always put the prompt on the clipboard / offer Web Share, and treat the deep link as a convenience that may land on an empty composer.
- BYO-key and localhost-bridge are both technically feasible from a static PWA, but each carries real cost (key-in-browser risk; Ollama `OLLAMA_ORIGINS` config, Chrome Local Network Access prompt, Safari blocking). Nothing found here makes deep links "insufficient" for MVP; keep "Ask AI beyond deep links" in the fog.

## 1. Per-assistant facts

### Claude

| Surface | URL shape | Status |
|---|---|---|
| Web | `https://claude.ai/new?q=<urlencoded prompt>` | **[de-facto]** Not documented in the Claude Help Center. |
| Desktop app | `claude://claude.ai/new?q=<prompt>` | **[official]** |
| Mobile app | `claude://code/new?q=` (Claude Code tab only), universal link `https://claude.ai/code/new` | **[official]**, but Code-only; no documented mobile *chat* prompt link. |

- Desktop doc: `claude://claude.ai/new?q={prompt}` starts a new chat with a prefilled prompt; "Prompt text passed in `q` is truncated to roughly 14,000 characters"; values must be URL-encoded; the prompt is prefilled, not sent. Source: [Open Claude Desktop with a link — Claude Help Center](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link).
- Mobile doc: only `claude://code…` and `https://claude.ai/code…` universal links are documented; `q`/`prompt` is "Text to prefill in the composer"; universal links open the app if installed, otherwise the browser; requires Claude Code access. No length limit stated. Source: [Open the Claude mobile app with a link — Claude Help Center](https://support.claude.com/en/articles/14898120-open-the-claude-mobile-app-with-a-link).
- Web `claude.ai/new?q=`: existence and behaviour (prefills the composer) are described by a security write-up of a since-fixed prompt-injection issue in that very parameter: [Oasis Security, Mar 2026](https://www.oasis.security/blog/claude-ai-prompt-injection-data-exfiltration-vulnerability). It is also the URL hard-coded in Vercel's `OpenInClaude` component: [vercel/ai-elements `open-in-chat.tsx`](https://github.com/vercel/ai-elements/blob/main/packages/elements/src/open-in-chat.tsx).
- Instability evidence: a user report that `claude.ai/new?q=` stopped working around 2 Oct 2025, closed "not planned" with no staff explanation: [anthropics/claude-code#8827](https://github.com/anthropics/claude-code/issues/8827). Later sources (Oasis 2026, ai-elements) show it working again as prefill. Historic auto-submit should not be assumed; treat as **prefill-only, user presses send**.
- Mobile behaviour of the web URL: `claude.ai` is a universal-link domain (per the mobile doc above), so `https://claude.ai/new?q=…` may be handed to the installed app; whether the app honours `q` for *chat* is undocumented. **Not verified in this research — needs a manual smoke test on iOS and Android.**

### ChatGPT

- URL shapes: `https://chatgpt.com/?q=<prompt>` and `https://chatgpt.com/?prompt=<prompt>`; extra params seen in the wild: `hints=search`, `temporary-chat=true`, `model=` (unreliable). **[de-facto / community]** Source: [OpenAI Developer Community — Query parameters in ChatGPT](https://community.openai.com/t/query-parameters-in-chatgpt/1027747); no OpenAI staff confirmation in that thread, and no OpenAI help/doc page for it was found.
- Vercel's `OpenInChatGPT` uses `https://chatgpt.com/?hints=search&prompt=…` ([ai-elements source](https://github.com/vercel/ai-elements/blob/main/packages/elements/src/open-in-chat.tsx)). For this app, omit `hints=search` — an Exercise explanation needs no web search.
- Auto-submit: community reports say `?q=` historically submitted immediately while `?prompt=` prefills; behaviour has varied. Treat as unspecified.
- Length limit: none documented. Practical ceiling is URL length handling in browsers/CDN/WAF (the community thread mentions WAF blocking and character restrictions). **Unknown; test empirically and budget conservatively.**
- Mobile: `chatgpt.com` links can open the installed app via universal/app links; whether the app honours `q`/`prompt` is undocumented. **Needs a manual smoke test.**

### Others (brief)

| Assistant | URL | Status |
|---|---|---|
| Perplexity | `https://www.perplexity.ai/search/?q=<prompt>` | **[de-facto]**, behaves like a search-engine URL, auto-runs ([qutebrowser discussion](https://github.com/qutebrowser/qutebrowser/discussions/8435)); also a built-in Mintlify target. |
| Gemini | none | **Not supported natively**; only via third-party browser extensions ([Google AI forum thread](https://discuss.ai.google.dev/t/can-the-gemini-api-enable-a-website-to-open-the-gemini-site-with-a-text-prompt-pre-filled-by-that-website/73828), [gemini-url-prompt extension](https://github.com/elliot79313/gemini-url-prompt)). |
| T3 Chat, Scira, v0 | `https://t3.chat/new?q=`, `https://scira.ai/?q=`, `https://v0.app?q=` | **[de-facto]** per [ai-elements source](https://github.com/vercel/ai-elements/blob/main/packages/elements/src/open-in-chat.tsx). |
| Cursor | `https://cursor.com/link/prompt?text=` | per same source; not relevant to a reading trainer. |

Ecosystem signal: "Open in ChatGPT / Claude / Perplexity" is a shipped, default feature of Mintlify docs sites ([Mintlify contextual menu](https://www.mintlify.com/docs/ai/contextual-menu)) and of Vercel's AI Elements. Breaking these URLs would break a lot of documentation sites, which is a (soft) stability incentive for the vendors. Note that Mintlify mostly sends a short prompt containing a *URL to the page's markdown* rather than the whole content — a way around length limits that this app cannot fully use, because an Exercise has no public per-Exercise URL unless the Pack host provides one.

## 2. Length budget

- Only hard number found: Claude desktop truncates `q` at ~14,000 characters (official, link above). Everything else is undocumented.
- A Choice Exercise (snippet ≤ ~40 lines, prompt, 4 options, the Learner's answer, Rationales) is roughly 1.5–3 KB of text; URL-encoding code inflates it (newlines, spaces, braces, `&`, `<` each become 3 bytes), typically 1.5–2x. That lands around 3–6 KB — inside the Claude limit and within what modern browsers accept, but above the old conservative 2,000-character rule of thumb, and unverified against ChatGPT's edge.
- Design consequence: build the prompt with a hard cap (suggest ~6,000 encoded characters); when over, drop Rationales first, then non-chosen options, and always keep the full prompt on the clipboard.

## 3. Installed-PWA and mobile hand-off

- A normal `<a href target="_blank" rel="noopener">` from an installed PWA to another origin leaves the PWA scope: on Android it opens a Custom Tab/browser or the target's verified app-link handler; on iOS it opens an in-app browser sheet or the universal-link target app. The PWA cannot detect which happened and cannot detect whether the prompt arrived.
- Custom schemes (`claude://`) from a web page fail silently or show an error when the app is absent, with no reliable detection. Prefer `https://` links and let the OS do universal/app-link routing. Do not use `claude://claude.ai/new?q=` as the primary link — it is desktop-app-only per the docs.
- Because arrival of the prompt cannot be confirmed, **copy to clipboard in the same click handler** (`navigator.clipboard.writeText` needs a secure context and user activation, both satisfied) and tell the Learner "Prompt copied — paste if the chat opens empty".

## 4. Web Share API as fallback

Source: [MDN — Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

- Requires secure context (HTTPS — true for GitHub/Cloudflare Pages), transient user activation (a tap), and the `web-share` permissions policy. Shares `title`, `text`, `url`, `files`.
- "Limited availability", not Baseline: solid on Android Chrome and iOS/macOS Safari; absent or partial on desktop Firefox and desktop Chrome on Linux. Feature-detect with `navigator.share` / `navigator.canShare()`; handle `AbortError` (user cancelled) quietly.
- Fit: on mobile this is arguably the *best* path — the share sheet lists the installed Claude/ChatGPT/Gemini apps, accepts arbitrarily long `text`, has no URL length issue, and is vendor-neutral (covers Gemini, which has no deep link). Whether a given app registers as a text share target is up to that app; not verified per app here.
- Works offline to the extent the share sheet opens; the target app still needs a network.

## 5. Alternatives beyond deep links (for the fog item)

### BYO API key, called directly from the browser

- Anthropic: CORS is enabled only when the request carries `anthropic-dangerous-direct-browser-access: true`; the TypeScript SDK exposes this as `dangerouslyAllowBrowser: true`, "disabled by default to avoid exposing your secret API credentials". Sources: [anthropic-sdk-typescript README](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/README.md), [Simon Willison's notes on the header, Aug 2024](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/) (which names BYO-key as the intended legitimate use).
- OpenAI: same shape — `dangerouslyAllowBrowser`, same warning: [openai-node README](https://github.com/openai/openai-node/blob/master/README.md).
- What the static PWA would need: a settings screen for the key; storage in `localStorage`/IndexedDB (readable by any script on the origin, so this raises the bar on Pack content sanitising — a third-party Pack that achieves XSS steals the key); a CSP with `connect-src` limited to the API hosts; streaming response UI; error/cost handling; a per-provider adapter. Excluded from the Progress Log export. No server needed.
- Judgement: feasible, moderate work, and couples directly to the open "Third-party Pack trust" item. The audience is a small subset (Learners who hold an API key).

### Localhost bridge (Ollama or a local CLI wrapper)

- Mixed content: `http://127.0.0.0/8`, `::1`, `localhost` and `*.localhost` are "potentially trustworthy" origins, so an HTTPS page fetching `http://localhost:11434` is not mixed content per spec: [W3C Secure Contexts](https://w3c.github.io/webappsec-secure-contexts/), [W3C Mixed Content](https://w3c.github.io/webappsec-mixed-content/). Chromium and Firefox follow this; Safari has historically blocked it (community reports, e.g. [GPT for Work Ollama setup notes](https://gptforwork.com/help/ai-models/endpoints/set-up-ollama-on-macos)) — so iOS and macOS Safari are effectively out.
- CORS: "Ollama allows cross-origin requests from `127.0.0.1` and `0.0.0.0` by default. Additional origins can be configured with `OLLAMA_ORIGINS`." The Learner must set `OLLAMA_ORIGINS=https://<app-host>` and restart Ollama: [Ollama FAQ](https://docs.ollama.com/faq).
- Chrome Local Network Access: from Chrome 142, a public site requesting a loopback/local address triggers a user permission prompt; requires a secure context: [Chrome for Developers — Local Network Access](https://developer.chrome.com/blog/local-network-access).
- Mobile: no localhost model server on phones, which is where a 10–15 minute daily Session mostly happens.
- A "local CLI" bridge (e.g. wrapping a coding-agent CLI) would need the Learner to run a custom local HTTP server with the same CORS + LNA + Safari constraints, plus the project shipping and maintaining that server. Out of proportion for MVP.
- Judgement: desktop-Chromium/Firefox-only, requires env-var configuration by the Learner. Power-user feature at best.

## 6. Recommendation

1. **Ship deep links in MVP, framed as "Copy prompt + open".** One "Ask an AI" control on the Explanation screen that, in a single user gesture: (a) builds a plain-text prompt from the Exercise (language, snippet, question, options, Learner's answer, correct answer, Rationales), (b) writes it to the clipboard, (c) opens the chosen target. Show "Prompt copied — paste it if the chat opens empty."
2. **Targets:** `https://claude.ai/new?q=…` and `https://chatgpt.com/?prompt=…` (no `hints=search`), plus a plain **Copy prompt** item, plus **Share…** when `navigator.share` exists (put it first on mobile). Optionally Perplexity. No Gemini link — it does not exist; Share/Copy covers it.
3. **Keep targets as data, not code:** a small table `{ id, label, urlTemplate, maxEncodedLength }` in app config so a broken vendor URL is a one-line fix — these URLs are undocumented and have broken before. Do not put assistant URLs in the Pack format.
4. **Cap the encoded prompt (~6,000 chars; Claude's documented truncation is ~14,000)** with a deterministic trimming order; the clipboard copy is always full-length.
5. **Use `https://` links only**, `target="_blank" rel="noopener noreferrer"`; never custom schemes; never assume auto-submit.
6. **Spec a manual smoke-test matrix** (not resolvable by desk research): {claude.ai, chatgpt.com} x {desktop browser, iOS Safari, iOS installed PWA, Android Chrome, Android installed PWA} x {app installed, not installed}, recording whether the prompt arrives and the max length that survives.
7. **Leave "Ask AI beyond deep links" in the fog / out of MVP.** Deep link + clipboard + Web Share covers every Learner on every platform with zero secrets and zero network permissions in the app. If revisited later, BYO-key is the better second step (works on mobile, no local install) but only after the third-party Pack sanitising question is settled; the localhost bridge is the weakest option (no Safari, no mobile, manual CORS config, Chrome permission prompt).

## Open gaps

- Current live behaviour of `claude.ai/new?q=` and `chatgpt.com/?prompt=` on mobile apps, and real length ceilings, were not tested — sources are documentation and source code only.
- Safari's localhost mixed-content behaviour is cited from secondary sources; verify against a current Safari before relying on it either way.
