import type { Exercise } from '../../src/core/types.ts'

export interface CompilerError {
  code: string
  line: number
}

/** The language toolchain, as far as claim verification needs it: compile a snippet and, if that works, run it. */
export interface Toolchain {
  run(code: string[]): Promise<{ compiled: boolean; stdout: string; errors: CompilerError[] }>
}

/** Check an Exercise's claim against the toolchain. Returns problems; empty means the claim holds. */
export async function verifyExercise(ex: Exercise, toolchain: Toolchain): Promise<string[]> {
  const claim = ex.verify
  if (!claim) return [`${ex.id}: has no verify claim`]
  const result = await toolchain.run(ex.code)
  const say = (msg: string) => [`${ex.id}: ${msg}`]
  const reported = () => result.errors.map((e) => `${e.code} (line ${e.line})`).join(', ') || 'no coded error'

  if ('stdout' in claim) {
    if (!result.compiled)
      return say(`claims stdout ${JSON.stringify(claim.stdout)} but the compiler reported ${reported()}`)
    const printed = result.stdout.trimEnd()
    if (printed !== claim.stdout.trimEnd())
      return say(`claims stdout ${JSON.stringify(claim.stdout)} but the program printed ${JSON.stringify(printed)}`)
    // Multi-line output can't sit in an inline code span, so only single-line answers are cross-checked.
    const stated = ex.type === 'choice' ? ex.options.find((o) => o.correct)?.text?.replace(/^`|`$/g, '') : undefined
    if (stated !== undefined && !printed.includes('\n') && stated !== printed)
      return say(`the program prints ${JSON.stringify(printed)} but the correct option says ${JSON.stringify(stated)}`)
    return []
  }

  if ('error' in claim) {
    if (result.compiled) return say(`claims error ${claim.error} but the snippet compiles`)
    const hits = result.errors.filter((e) => e.code === claim.error)
    if (hits.length === 0) {
      return say(`claims error ${claim.error} but the compiler reported ${reported()}`)
    }
    const accepted = ex.type === 'line-select' ? ex.correctLines : claim.line === undefined ? undefined : [claim.line]
    const stray = hits.find((e) => accepted && !accepted.includes(e.line))
    if (stray)
      return [
        `${ex.id}: ${claim.error} is reported on line ${stray.line}, but ${ex.type === 'line-select' ? 'correctLines' : 'the claimed line'} is [${accepted!.join(', ')}]`,
      ]
    return []
  }

  if (!result.compiled) return say(`claims to compile but the compiler reported ${reported()}`)
  return []
}
