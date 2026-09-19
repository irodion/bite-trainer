// Pack format v1 — see .scratch/bite-trainer/issues/05-pack-format-prototype.md

export interface PackManifest {
  formatVersion: 1
  id: string
  version: string
  title: string
  description: string
  language: { id: string; name: string; highlight: string; verifiedWith?: string }
  license: string
  attribution?: string[]
  flavors: Record<string, { label: string }>
  topics: { id: string; title: string; file: string }[]
}

export interface Primer {
  title: string
  body: string[]
}

/**
 * The machine-checkable claim an Exercise makes about its snippet, proven at author time by the language toolchain:
 * it prints exactly this (trailing whitespace ignored), it fails to compile with this error (on this line), or it just compiles.
 */
export type Claim = { stdout: string } | { error: string; line?: number } | { compiles: true }

interface ExerciseBase {
  id: string
  flavor: string
  timeBudget: number
  prompt: string
  code: string[]
  focus?: [number, number]
  explanation?: string
  /** Where the Exercise was adapted from, for attribution (e.g. "rustlings: move_semantics2"). */
  source?: string
  verify?: Claim
}

export interface ChoiceOption {
  id: string
  text?: string
  code?: string[]
  correct?: boolean
  rationale: string
}

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice'
  options: ChoiceOption[]
}

export interface LineSelectExercise extends ExerciseBase {
  type: 'line-select'
  correctLines: number[]
  rationale: string
  lineRationales?: Record<string, string>
  fallbackRationale: string
}

export type Exercise = ChoiceExercise | LineSelectExercise

export interface Topic {
  id: string
  title: string
  primer?: Primer
  exercises: Exercise[]
}

export interface Pack {
  source: string
  manifest: PackManifest
  topics: Topic[]
}

// Progress Log — see issues/08-progress-log-schema.md

interface EventBase {
  id: string
  instanceId: string
  at: number
  tzOffsetMin: number
}

export interface AttemptEvent extends EventBase {
  type: 'attempt'
  sessionId: string
  packId: string
  packVersion: string
  exerciseId: string
  answer: { optionId: string } | { line: number }
  correct: boolean
  elapsedMs: number
  timeBudget: number
}

export interface SessionCompletedEvent extends EventBase {
  type: 'session-completed'
  sessionId: string
}

export interface ResetEvent extends EventBase {
  type: 'reset'
  packId: string
}

export type LogEvent = AttemptEvent | SessionCompletedEvent | ResetEvent
