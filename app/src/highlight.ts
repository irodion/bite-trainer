import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

export interface Tok {
  text: string
  style: string
}

// Grammar ids a Pack may name in `language.highlight`; anything else renders as plain text.
const LANGS: Record<string, () => Promise<unknown>> = {
  rust: () => import('shiki/langs/rust.mjs'),
  python: () => import('shiki/langs/python.mjs'),
}

let hl: Promise<HighlighterCore> | undefined
const loaded = new Set<string>()

export function plain(lines: string[]): Tok[][] {
  return lines.map((text) => [{ text, style: '' }])
}

export async function highlight(lines: string[], lang: string): Promise<Tok[][]> {
  const load = LANGS[lang]
  if (!load) return plain(lines)
  hl ??= createHighlighterCore({
    // Colours come from CSS custom properties in tokens.css, so light/dark needs no second theme.
    themes: [createCssVariablesTheme({ name: 'tokens', variablePrefix: '--shiki-', fontStyle: true })],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  })
  const h = await hl
  if (!loaded.has(lang)) {
    await h.loadLanguage((await load()) as never)
    loaded.add(lang)
  }
  const { tokens } = h.codeToTokens(lines.join('\n'), { lang, theme: 'tokens' })
  return tokens.map((line) => line.map((t) => ({ text: t.content, style: t.color ? `color:${t.color}` : '' })))
}
