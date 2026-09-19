// The ONE boundary where untrusted Pack JSON becomes typed data. Nothing downstream casts or re-checks:
// every value of type PackManifest / Topic / Exercise in the app was built here, field by field.
// Unknown fields are dropped; a wrong or missing known field is a problem — never silently skipped.
import type { ChoiceOption, Claim, Exercise, PackManifest, Primer, Topic } from './types.ts'

type Json = Record<string, unknown>
export type ParsedPack = { ok: true; manifest: PackManifest; topics: Topic[] } | { ok: false; problems: string[] }
export type ParsedManifest = { ok: true; manifest: PackManifest } | { ok: false; problems: string[] }

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isLines = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((l) => typeof l === 'string')
const isLineNo = (v: unknown, lines: number): v is number =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= lines

/** Collects problems under a label ("pack.json", an Exercise id…) while values are read. */
class Reader {
  private readonly label: string
  private readonly problems: string[]
  constructor(label: string, problems: string[]) {
    this.label = label
    this.problems = problems
  }
  say(msg: string) {
    this.problems.push(`${this.label}: ${msg}`)
  }
  /** A required non-empty string. */
  text(obj: Json, field: string, name = field): string {
    if (isText(obj[field])) return obj[field]
    this.say(`missing ${name}`)
    return ''
  }
  optionalText(obj: Json, field: string): string | undefined {
    if (obj[field] === undefined) return undefined
    if (typeof obj[field] === 'string') return obj[field]
    this.say(`${field} must be text`)
    return undefined
  }
}

export function parseManifest(json: unknown): ParsedManifest {
  if (!isObj(json)) return { ok: false, problems: ['pack.json: not a JSON object'] }
  if (json.formatVersion !== 1)
    return { ok: false, problems: [`pack.json: unsupported formatVersion ${json.formatVersion}`] }

  const problems: string[] = []
  const r = new Reader('pack.json', problems)
  const language = isObj(json.language) ? json.language : {}
  const flavors: PackManifest['flavors'] = {}
  if (isObj(json.flavors)) {
    for (const [id, f] of Object.entries(json.flavors)) {
      if (isObj(f) && isText(f.label)) flavors[id] = { label: f.label }
      else r.say(`flavor "${id}" needs a label`)
    }
  } else r.say('missing flavors')

  const topics: PackManifest['topics'] = []
  if (Array.isArray(json.topics) && json.topics.length > 0) {
    json.topics.forEach((t, i) => {
      if (!isObj(t)) return r.say(`topics entry ${i + 1} is not an object`)
      const entry = new Reader(`pack.json topics entry ${i + 1}`, problems)
      topics.push({ id: entry.text(t, 'id'), title: entry.text(t, 'title'), file: entry.text(t, 'file') })
    })
    for (const id of duplicates(topics.map((t) => t.id))) r.say(`Topic id "${id}" is listed more than once`)
  } else r.say('missing topics')

  const manifest: PackManifest = {
    formatVersion: 1,
    id: r.text(json, 'id'),
    version: r.text(json, 'version'),
    title: r.text(json, 'title'),
    description: r.optionalText(json, 'description') ?? '',
    language: {
      id: r.text(language, 'id', 'language.id'),
      name: r.text(language, 'name', 'language.name'),
      highlight: r.text(language, 'highlight', 'language.highlight'),
      verifiedWith: r.optionalText(language, 'verifiedWith'),
    },
    license: r.optionalText(json, 'license') ?? '',
    attribution: Array.isArray(json.attribution) ? json.attribution.filter((a) => typeof a === 'string') : undefined,
    flavors,
    topics,
  }
  return problems.length ? { ok: false, problems } : { ok: true, manifest }
}

/** Parse the Topic files that a (already parsed) manifest lists, in the manifest's order. */
export function parseTopics(
  manifest: PackManifest,
  jsons: unknown[],
): { ok: true; topics: Topic[] } | { ok: false; problems: string[] } {
  if (jsons.length !== manifest.topics.length) {
    return {
      ok: false,
      problems: [`pack.json lists ${manifest.topics.length} Topics but ${jsons.length} Topic files were loaded`],
    }
  }
  const problems: string[] = []
  const topics = jsons.map((json, i) => parseTopic(json, manifest.topics[i], manifest, problems))
  const allIds = topics.flatMap((t) => t.exercises.map((e) => e.id)).filter(Boolean)
  for (const id of duplicates(allIds)) problems.push(`${id}: this Exercise id is used more than once in the Pack`)
  return problems.length ? { ok: false, problems } : { ok: true, topics }
}

export function parsePack(manifestJson: unknown, topicJsons: unknown[]): ParsedPack {
  const m = parseManifest(manifestJson)
  if (!m.ok) return m
  const t = parseTopics(m.manifest, topicJsons)
  return t.ok ? { ok: true, manifest: m.manifest, topics: t.topics } : t
}

function parseTopic(
  json: unknown,
  listed: PackManifest['topics'][number],
  manifest: PackManifest,
  problems: string[],
): Topic {
  const empty: Topic = { id: listed.id, title: listed.title, exercises: [] }
  if (!isObj(json)) {
    problems.push(`${listed.file}: not a JSON object`)
    return empty
  }
  if (json.id !== listed.id) {
    problems.push(`${listed.file}: Topic id ${JSON.stringify(json.id)} does not match pack.json ("${listed.id}")`)
    return empty
  }
  const r = new Reader(listed.id, problems)
  if (!Array.isArray(json.exercises)) r.say('exercises must be a list')
  const exercises = Array.isArray(json.exercises) ? json.exercises : []
  return {
    id: listed.id,
    title: r.text(json, 'title'),
    primer: json.primer === undefined ? undefined : parsePrimer(json.primer, r),
    exercises: exercises.flatMap((ex) => parseExercise(ex, listed.id, manifest, problems) ?? []),
  }
}

function parsePrimer(json: unknown, r: Reader): Primer | undefined {
  if (!isObj(json)) return void r.say('primer must be an object')
  if (!isLines(json.body)) r.say('primer body must be a list of text blocks')
  return { title: r.text(json, 'title', 'primer title'), body: isLines(json.body) ? json.body : [] }
}

function parseExercise(
  json: unknown,
  topicId: string,
  manifest: PackManifest,
  problems: string[],
): Exercise | undefined {
  if (!isObj(json) || !isText(json.id)) return void problems.push(`${topicId}: an Exercise has no id`)
  const r = new Reader(json.id, problems)

  if (!isLines(json.code)) r.say('code must be an array of lines')
  const code = isLines(json.code) ? json.code : []
  if (typeof json.timeBudget !== 'number' || !(json.timeBudget > 0)) r.say('timeBudget must be a positive number')

  const flavor = r.text(json, 'flavor')
  if (flavor && !(flavor in manifest.flavors)) r.say(`flavor "${flavor}" is not declared in pack.json`)

  let focus: [number, number] | undefined
  if (json.focus !== undefined) {
    const f = json.focus
    if (
      Array.isArray(f) &&
      f.length === 2 &&
      isLineNo(f[0], code.length) &&
      isLineNo(f[1], code.length) &&
      f[0] <= f[1]
    )
      focus = [f[0], f[1]]
    else r.say('focus must be [from, to] inside the snippet')
  }

  const base = {
    id: json.id,
    flavor,
    timeBudget: typeof json.timeBudget === 'number' ? json.timeBudget : 0,
    prompt: r.text(json, 'prompt'),
    code,
    focus,
    explanation: r.optionalText(json, 'explanation'),
    source: r.optionalText(json, 'source'),
    verify: json.verify === undefined ? undefined : parseClaim(json.verify, r),
  }

  if (json.type === 'choice') return { ...base, type: 'choice', options: parseOptions(json.options, r) }
  if (json.type === 'line-select') {
    const correct = Array.isArray(json.correctLines) ? json.correctLines : []
    if (correct.length === 0) r.say('correctLines is empty')
    for (const l of correct)
      if (code.length && !isLineNo(l, code.length)) r.say(`correct line ${l} is outside the snippet`)

    const lineRationales: Record<string, string> = {}
    if (json.lineRationales !== undefined) {
      if (!isObj(json.lineRationales)) r.say('lineRationales must be an object')
      else
        for (const [key, text] of Object.entries(json.lineRationales)) {
          if (!isLineNo(Number(key), code.length)) r.say(`lineRationales key "${key}" is not a line of the snippet`)
          else if (!isText(text)) r.say(`lineRationales for line ${key} must be text`)
          else lineRationales[key] = text
        }
    }
    return {
      ...base,
      type: 'line-select',
      correctLines: correct.filter((l): l is number => isLineNo(l, code.length)),
      rationale: r.text(json, 'rationale'),
      lineRationales,
      fallbackRationale: r.text(json, 'fallbackRationale'),
    }
  }
  return void r.say(`unknown type ${JSON.stringify(json.type)}`)
}

function parseOptions(json: unknown, r: Reader): ChoiceOption[] {
  if (!Array.isArray(json) || json.length < 2) {
    r.say('a Choice needs at least two options')
    return []
  }
  const options: ChoiceOption[] = []
  json.forEach((o, i) => {
    if (!isObj(o)) return r.say(`option ${i + 1} is not an object`)
    if (!isText(o.id)) return r.say(`option ${i + 1} has no id`)
    const hasText = isText(o.text)
    const hasCode = isLines(o.code)
    // Exactly one of the two, and well-formed: a stray malformed `code` next to valid `text` is still a problem.
    const given = [o.text, o.code].filter((v) => v !== undefined).length
    if (given !== 1 || hasText === hasCode) r.say(`option ${o.id} needs either text or code`)
    if (!isText(o.rationale)) r.say(`option ${o.id} is missing rationale`)
    options.push({
      id: o.id,
      text: hasText ? (o.text as string) : undefined,
      code: hasCode ? (o.code as string[]) : undefined,
      correct: o.correct === true ? true : undefined,
      rationale: isText(o.rationale) ? o.rationale : '',
    })
  })
  for (const id of duplicates(options.map((o) => o.id))) r.say(`option id "${id}" is used more than once`)
  const n = options.filter((o) => o.correct).length
  if (n !== 1) r.say(`exactly one option must be correct (found ${n})`)
  return options
}

function parseClaim(json: unknown, r: Reader): Claim | undefined {
  if (isObj(json)) {
    if (typeof json.stdout === 'string') return { stdout: json.stdout }
    if (json.compiles === true) return { compiles: true }
    if (isText(json.error) && (json.line === undefined || Number.isInteger(json.line))) {
      return json.line === undefined ? { error: json.error } : { error: json.error, line: json.line as number }
    }
  }
  return void r.say('verify must be { stdout }, { error, line? } or { compiles: true }')
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const twice = new Set<string>()
  for (const id of ids) (seen.has(id) ? twice : seen).add(id)
  return [...twice]
}
