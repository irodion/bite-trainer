import { expect, test, type Page } from '@playwright/test'

async function answerCurrentExercise(page: Page) {
  const gutter = page.getByRole('button', { name: 'Select line 1', exact: true })
  if (await gutter.isVisible()) await gutter.click()
  else await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await page.getByRole('button', { name: /^(Next|Finish)$/ }).click()
}

test('after one online visit, a Learner can reload offline, complete a Session, and keep the progress', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: /Start Session/ })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  // Highlighter grammar chunks are lazy: they must come from the precache, not from having been visited.

  await context.setOffline(true)
  await page.reload()

  const start = page.getByRole('button', { name: /Start Session/ })
  const count = Number(/(\d+) Exercise/.exec((await start.textContent()) ?? '')?.[1])
  expect(count).toBeGreaterThan(0)
  await start.click()
  await expect(page.locator('.code span[style*="--shiki"]').first()).toBeVisible()
  for (let i = 0; i < count; i++) await answerCurrentExercise(page)

  await expect(page.getByText('Streak: 1 day')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Streak: 1 day')).toBeVisible()
  await expect(page.getByText(`${count + 1} events`)).toBeVisible()
})

test('the app is installable: manifest with name, icons, start_url and standalone display', async ({ page }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await page.request.get(new URL(href!, page.url()).toString())).json()
  expect(manifest).toMatchObject({ name: 'Bite Trainer', display: 'standalone', start_url: './' })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
})

test('options are shuffled: the same Exercise does not present its options in the same order every time', async ({
  page,
}) => {
  const orders = new Set<string>()
  for (let attempt = 0; attempt < 8; attempt++) {
    await page.goto('./')
    await page.getByRole('button', { name: /Start Session/ }).click()
    await page.getByRole('button', { name: /answers/ }).click()
    orders.add((await page.locator('.opt .body').allTextContents()).join(' | '))
  }
  // 4 options → 24 orders; 8 identical draws by chance is (1/24)^7.
  expect(orders.size).toBeGreaterThan(1)
})
