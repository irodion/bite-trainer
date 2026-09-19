import { expect, test } from 'vitest'
import type { Exercise } from '../../src/core/types.ts'
import { verifyExercise, type Toolchain } from './verifyExercise.ts'

/** A fake compiler: always reports the given result, whatever the code. */
const toolchain = (result: Awaited<ReturnType<Toolchain['run']>>): Toolchain => ({ run: async () => result })

const predictOutput: Exercise = {
  id: 'sum-evens',
  type: 'choice',
  flavor: 'predict-output',
  timeBudget: 45,
  prompt: 'What does this program print?',
  code: ['fn main() {', '    println!("{}", 2 + 4);', '}'],
  verify: { stdout: '6' },
  options: [
    { id: 'a', text: '`6`', correct: true, rationale: '2 + 4.' },
    { id: 'b', text: '`24`', rationale: 'Not string concatenation.' },
  ],
}

test('a predict-output claim holds when the program prints what the Exercise says', async () => {
  expect(await verifyExercise(predictOutput, toolchain({ compiled: true, stdout: '6\n', errors: [] }))).toEqual([])
})

test('a predict-output claim fails when the program prints something else', async () => {
  expect(await verifyExercise(predictOutput, toolchain({ compiled: true, stdout: '7\n', errors: [] }))).toEqual([
    'sum-evens: claims stdout "6" but the program printed "7"',
  ])
})

const findTheLine: Exercise = {
  id: 'use-after-move',
  type: 'line-select',
  flavor: 'find-the-line',
  timeBudget: 60,
  prompt: 'Tap the line the compiler rejects.',
  code: ['fn main() {', '    let s = String::new();', '    drop(s);', '    println!("{s}");', '}'],
  verify: { error: 'E0382' },
  correctLines: [4],
  rationale: 'Used after move.',
  fallbackRationale: 'That line compiles.',
}

test('a compile-error claim holds when the compiler reports that error on a correct line', async () => {
  const rustc = toolchain({ compiled: false, stdout: '', errors: [{ code: 'E0382', line: 4 }] })
  expect(await verifyExercise(findTheLine, rustc)).toEqual([])
})

test('a compile-error claim fails when the snippet compiles after all', async () => {
  const rustc = toolchain({ compiled: true, stdout: '', errors: [] })
  expect(await verifyExercise(findTheLine, rustc)).toEqual([
    'use-after-move: claims error E0382 but the snippet compiles',
  ])
})

test('a compile-error claim fails when the compiler reports a different error', async () => {
  const rustc = toolchain({ compiled: false, stdout: '', errors: [{ code: 'E0499', line: 4 }] })
  expect(await verifyExercise(findTheLine, rustc)).toEqual([
    'use-after-move: claims error E0382 but the compiler reported E0499 (line 4)',
  ])
})

test('a Line-Select Exercise fails when the error is on a line the Exercise does not accept', async () => {
  const rustc = toolchain({ compiled: false, stdout: '', errors: [{ code: 'E0382', line: 3 }] })
  expect(await verifyExercise(findTheLine, rustc)).toEqual([
    'use-after-move: E0382 is reported on line 3, but correctLines is [4]',
  ])
})

test('a "compiles" claim fails when the snippet does not compile', async () => {
  const ex: Exercise = { ...predictOutput, id: 'refactor', flavor: 'pick-refactor', verify: { compiles: true } }
  const rustc = toolchain({ compiled: false, stdout: '', errors: [{ code: 'E0308', line: 2 }] })
  expect(await verifyExercise(ex, rustc)).toEqual([
    'refactor: claims to compile but the compiler reported E0308 (line 2)',
  ])
})

test('a predict-output claim fails when the program does not even compile', async () => {
  const rustc = toolchain({ compiled: false, stdout: '', errors: [{ code: 'E0425', line: 2 }] })
  expect(await verifyExercise(predictOutput, rustc)).toEqual([
    'sum-evens: claims stdout "6" but the compiler reported E0425 (line 2)',
  ])
})

test('the correct option of a predict-output Choice must state the verified output', async () => {
  const ex: Exercise = {
    ...predictOutput,
    options: [
      { id: 'a', text: '`7`', correct: true, rationale: '' },
      { id: 'b', text: '`6`', rationale: '' },
    ],
  }
  expect(await verifyExercise(ex, toolchain({ compiled: true, stdout: '6\n', errors: [] }))).toEqual([
    'sum-evens: the program prints "6" but the correct option says "7"',
  ])
})

test('an Exercise with no claim is reported, so nothing ships unverified by accident', async () => {
  const unclaimed = { ...predictOutput, verify: undefined }
  expect(await verifyExercise(unclaimed, toolchain({ compiled: true, stdout: '', errors: [] }))).toEqual([
    'sum-evens: has no verify claim',
  ])
})
