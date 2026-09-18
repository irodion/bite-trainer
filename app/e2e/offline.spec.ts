import { expect, test, type Page } from '@playwright/test'

async function answerCurrentExercise(page: Page) {
  const gutter = page.getByRole('button', { name: 'Select line 1', exact: true })
  if (await gutter.isVisible()) await gutter.click()
  else await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await page.getByRole('button', { name: /^(Next|Finish)$/ }).click()
}

test('after one online visit, a Learner can reload offline, complete a Session, and keep the progress', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: /Start Session/ })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  // Highlighter grammar chunks are lazy: they must come from the precache, not from having been visited.

  await context.setOffline(true)
  await page.reload()

  await page.getByRole('button', { name: /Start Session · 4 Exercises/ }).click()
  await expect(page.locator('.code span[style*="--shiki"]').first()).toBeVisible()
  for (let i = 0; i < 4; i++) await answerCurrentExercise(page)

  await expect(page.getByText('Streak: 1 day')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Streak: 1 day')).toBeVisible()
  await expect(page.getByText(/5 events/)).toBeVisible()
  await expect(page.getByText('Nothing due today')).toBeVisible()
})

test('the app is installable: manifest with name, icons, start_url and standalone display', async ({ page }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await page.request.get(new URL(href!, page.url()).toString())).json()
  expect(manifest).toMatchObject({ name: 'Bite Trainer', display: 'standalone', start_url: './' })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
})
