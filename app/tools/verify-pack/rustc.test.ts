import { execFileSync } from 'node:child_process'
import { expect, test, vi } from 'vitest'
import { rustcToolchain } from './rustc.ts'

// These tests run the real compiler. The first compile on a cold machine (a fresh CI runner) can take over five
// seconds, which is Vitest's default limit — observed as a flaky failure in CI.
vi.setConfig({ testTimeout: 60_000 })

const hasRustc = (() => {
  try {
    execFileSync('rustc', ['--version'])
    return true
  } catch {
    return false
  }
})()

test.skipIf(!hasRustc)('real rustc: a valid program compiles and its stdout is captured', async () => {
  const result = await rustcToolchain().run([
    'fn main() {',
    '    let v = vec![1, 2, 3];',
    '    println!("{}", v.iter().sum::<i32>());',
    '}',
  ])
  expect(result).toEqual({ compiled: true, stdout: '6\n', errors: [] })
})

test.skipIf(!hasRustc)('real rustc: a use-after-move is reported as E0382 on the line of the later use', async () => {
  const result = await rustcToolchain().run([
    'fn main() {',
    '    let s = String::from("hi");',
    '    let t = s;',
    '    println!("{s} {t}");',
    '}',
  ])
  expect(result).toEqual({ compiled: false, stdout: '', errors: [{ code: 'E0382', line: 4 }] })
})

test.skipIf(!hasRustc)('real rustc: warnings do not count as errors', async () => {
  const result = await rustcToolchain().run(['fn main() {', '    let unused = 1;', '}'])
  expect(result).toEqual({ compiled: true, stdout: '', errors: [] })
})

test.skipIf(!hasRustc)(
  'real rustc: a snippet without main is compiled as a library, and unused-code warnings are not errors',
  async () => {
    const result = await rustcToolchain().run(['fn double(n: i32) -> i32 {', '    n * 2', '}'])
    expect(result).toEqual({ compiled: true, stdout: '', errors: [] })
  },
)

test.skipIf(!hasRustc)('real rustc: a library snippet still reports its compile errors', async () => {
  const result = await rustcToolchain().run(['fn double(n: i32) -> i32 {', '    n * "2"', '}'])
  expect(result).toEqual({ compiled: false, stdout: '', errors: [{ code: 'E0277', line: 2 }] })
})
