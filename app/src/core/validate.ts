type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/** Structural check of a fetched Pack. Returns Learner-readable problems; empty means the Pack may be stored. */
export function validatePack(manifest: unknown, topics: unknown[]): string[] {
  if (!isObj(manifest)) return ['pack.json: not a JSON object']
  if (manifest.formatVersion !== 1) return [`pack.json: unsupported formatVersion ${manifest.formatVersion}`]

  const problems: string[] = []
  for (const field of ['id', 'version', 'title']) if (!isText(manifest[field])) problems.push(`pack.json: missing ${field}`)
  if (!isObj(manifest.language) || !isText(manifest.language.highlight)) problems.push('pack.json: missing language.highlight')
  if (!Array.isArray(manifest.topics)) problems.push('pack.json: missing topics')

  topics.forEach((topic, i) => {
    if (!isObj(topic) || !isText(topic.id) || !Array.isArray(topic.exercises)) {
      problems.push(`topic ${i + 1}: needs an id and an exercises array`)
      return
    }
    for (const ex of topic.exercises) problems.push(...exerciseProblems(ex, topic.id))
  })
  return problems
}

function exerciseProblems(ex: unknown, topicId: string): string[] {
  if (!isObj(ex) || !isText(ex.id)) return [`${topicId}: an Exercise has no id`]
  const out: string[] = []
  const say = (msg: string) => out.push(`${ex.id}: ${msg}`)

  const code = ex.code
  const lines = Array.isArray(code) && code.every((l) => typeof l === 'string') ? code.length : undefined
  if (lines === undefined) say('code must be an array of lines')
  if (typeof ex.timeBudget !== 'number' || ex.timeBudget <= 0) say('timeBudget must be a positive number')
  if (!isText(ex.prompt)) say('missing prompt')

  if (ex.type === 'choice') {
    const options = Array.isArray(ex.options) ? (ex.options as unknown[]).filter(isObj) : []
    const n = options.filter((o) => o.correct === true).length
    if (n !== 1) say(`exactly one option must be correct (found ${n})`)
    if (options.some((o) => !isText(o.id))) say('every option needs an id')
  } else if (ex.type === 'line-select') {
    const correct = Array.isArray(ex.correctLines) ? ex.correctLines : []
    if (correct.length === 0) say('correctLines is empty')
    for (const l of correct) if (lines !== undefined && (typeof l !== 'number' || l < 1 || l > lines)) say(`correct line ${l} is outside the snippet`)
  } else say(`unknown type ${JSON.stringify(ex.type)}`)
  return out
}
