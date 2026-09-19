import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { CompilerError, Toolchain } from './verifyExercise.ts'

const exec = promisify(execFile)

interface Diagnostic {
  level: string
  code: { code: string } | null
  spans: { is_primary: boolean; line_start: number }[]
}

/** Compiles a snippet with the local `rustc` and runs the binary. Author-time only — the app never executes code. */
export function rustcToolchain(edition = '2021'): Toolchain {
  return {
    async run(code) {
      const dir = await mkdtemp(join(tmpdir(), 'verify-pack-'))
      try {
        await writeFile(join(dir, 'main.rs'), code.join('\n') + '\n')
        const bin = join(dir, 'main')
        // A snippet that is only functions and types has nothing to run: compile it as a library.
        const isProgram = code.some((l) => /^\s*(pub\s+)?fn\s+main\s*\(/.test(l))
        const errors = await compile(join(dir, 'main.rs'), bin, edition, isProgram)
        if (errors) return { compiled: false, stdout: '', errors }
        if (!isProgram) return { compiled: true, stdout: '', errors: [] }
        const { stdout } = await exec(bin, { timeout: 10_000 })
        return { compiled: true, stdout, errors: [] }
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    },
  }
}

/** Returns the coded errors, or undefined when compilation succeeded. */
async function compile(
  src: string,
  out: string,
  edition: string,
  isProgram: boolean,
): Promise<CompilerError[] | undefined> {
  try {
    const kind = isProgram ? [] : ['--crate-type', 'lib']
    await exec('rustc', ['--edition', edition, '--error-format=json', ...kind, '-o', out, src])
    return undefined
  } catch (e) {
    const stderr = (e as { stderr?: string }).stderr ?? ''
    const diagnostics = stderr
      .split('\n')
      .filter((l) => l.startsWith('{'))
      .map((l) => JSON.parse(l) as Diagnostic)
    return diagnostics
      .filter((d) => d.level === 'error' && d.code)
      .map((d) => ({ code: d.code!.code, line: d.spans.find((s) => s.is_primary)?.line_start ?? 0 }))
  }
}
