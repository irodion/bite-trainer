import { expect, test } from '@playwright/test'

test('a broken Pack update is refused: the good Pack keeps working, also offline on the next launch', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: /Start Session/ })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)

  // Upstream now ships a new version whose first Choice Exercise has a null option.
  await page.route('**/packs/rust/pack.json', async (route) => {
    const json = await (await route.fetch()).json()
    await route.fulfill({ json: { ...json, version: '99.0.0-broken' } })
  })
  await page.route('**/packs/rust/topics/*.json', async (route) => {
    const json = await (await route.fetch()).json()
    json.exercises.find((e: { type: string }) => e.type === 'choice')?.options.push(null)
    await route.fulfill({ json })
  })

  await page.reload()
  await expect(page.getByText('update refused: Pack has problems')).toBeVisible()
  await expect(page.getByText(/v99\.0\.0-broken/)).toHaveCount(0)

  // Next launch, no network: the stored Pack is still the good one and an Exercise renders.
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: /Start Session/ }).click()
  await expect(
    page
      .getByRole('button', { name: 'A', exact: true })
      .or(page.getByRole('button', { name: 'Select line 1', exact: true })),
  ).toBeVisible()
  await page.getByRole('button', { name: /answers/ }).click()
  await expect(page.locator('.opt')).toHaveCount(4)
})
