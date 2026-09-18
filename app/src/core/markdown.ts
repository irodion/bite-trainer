// Restricted Markdown → token tree. Never produces HTML (ADR 0001); the UI renders tokens as text nodes.

export type Inline =
  { t: 'text'; v: string } | { t: 'code'; v: string } | { t: 'strong'; c: Inline[] } | { t: 'em'; c: Inline[] }

export type Block = { t: 'p'; c: Inline[] } | { t: 'pre'; lines: string[] }

export function parseBlock(src: string): Block {
  const fence = /^```[^\n]*\n([\s\S]*?)\n?```\s*$/.exec(src)
  if (fence) return { t: 'pre', lines: fence[1].split('\n') }
  return { t: 'p', c: parseInline(src) }
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  const re = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) out.push({ t: 'text', v: src.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ t: 'code', v: m[1] })
    else if (m[2] !== undefined) out.push({ t: 'strong', c: parseInline(m[2]) })
    else out.push({ t: 'em', c: parseInline(m[3]) })
    last = re.lastIndex
  }
  if (last < src.length) out.push({ t: 'text', v: src.slice(last) })
  return out
}
