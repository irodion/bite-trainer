# Pack content is never rendered as HTML

Packs load from arbitrary URLs, so every string in one is untrusted. Instead of rendering Pack prose with a general Markdown library and sanitising the result, the app parses the Pack format's restricted Markdown with its own small parser into an AST and renders that AST as elements; highlighted code is rendered from highlighter tokens, not from the highlighter's HTML string. Raw-HTML insertion (`{@html}`, `innerHTML`) is forbidden for anything that originates in a Pack, and input outside the grammar shows up as literal text.

We chose this because it removes script injection structurally rather than relying on a sanitiser staying correct and up to date, at the cost of maintaining ~100 lines of parser and never getting Markdown features "for free".

## Considered Options

- **marked / markdown-it + DOMPurify** — less code to own, but safety then depends on sanitiser configuration, and the Pack format would silently accept whatever the library accepts.
- **Trusting only official Packs** — contradicts the decision that Packs load from any URL.
