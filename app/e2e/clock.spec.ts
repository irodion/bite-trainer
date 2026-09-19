import { expect, test } from '@playwright/test'

test('time the device spent asleep mid-Exercise is not charged to the Learner', async ({ page }) => {
  await page.clock.install()
  await page.goto('./')
  await page.getByRole('button', { name: /Start Session/ }).click()
  await page.locator('.keys').waitFor()

  await page.clock.runFor(10_000) // ten seconds of real reading, ticks firing normally
  await page.clock.fastForward(120_000) // two minutes pass with NO timers firing, then one tick: a woken device
  await page.clock.runFor(2_000)

  const gutter = page.getByRole('button', { name: 'Select line 1', exact: true })
  if (await gutter.count()) await gutter.click()
  else await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByRole('button', { name: 'Check' }).click()

  // ~12 s of watched time; the first Exercise's Time Budget is well above that. Never "2:12".
  await expect(page.locator('.after .time')).toHaveText(/^0:1[0-4] · within budget$/)
})
