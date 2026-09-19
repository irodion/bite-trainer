import { expect, test, type Page } from '@playwright/test'

async function answer(page: Page) {
  const gutter = page.getByRole('button', { name: 'Select line 1', exact: true })
  if (await gutter.isVisible()) await gutter.click()
  else await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByRole('button', { name: 'Check' }).click()
}
const next = (page: Page) => page.getByRole('button', { name: /^(Next|Finish)$/ }).click()
const sizeOf = async (page: Page, name: RegExp) =>
  Number(/(\d+)/.exec((await page.getByRole('button', { name }).textContent()) ?? '')?.[1])

test('a Learner can leave a Session halfway, come back after a reload, finish it, and see how it went', async ({
  page,
}) => {
  await page.goto('./')
  const total = await sizeOf(page, /Start Session/)
  await page.getByRole('button', { name: /Start Session/ }).click()

  await answer(page)
  await next(page)
  await answer(page)
  await page.getByRole('button', { name: 'Leave Session' }).click()

  // Home offers to continue, not to start over — and no Streak credit yet.
  await expect(page.getByText('Streak: 0 days')).toBeVisible()
  expect(await sizeOf(page, /Continue Session/)).toBe(total - 2)

  await page.reload()
  await page.getByRole('button', { name: /Continue Session/ }).click()
  for (let i = 0; i < total - 2; i++) {
    await answer(page)
    await next(page)
  }

  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  await expect(page.getByText(`${total} answered`)).toBeVisible()
  await expect(page.getByText('Streak: 1 day')).toBeVisible()

  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Done for today')).toBeVisible()
  await expect(page.getByRole('button', { name: /Practice more/ })).toBeVisible()
})
