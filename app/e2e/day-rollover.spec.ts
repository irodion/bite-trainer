import { expect, test, type Page } from '@playwright/test'

/** A Session completed elsewhere at the given local time, merged in through import. */
async function importCompletedSession(page: Page, localTime: string) {
  const events = [
    {
      instanceId: 'x',
      tzOffsetMin: new Date(localTime).getTimezoneOffset(),
      id: 'c1',
      type: 'session-completed',
      at: new Date(localTime).getTime(),
      sessionId: 's',
    },
  ]
  const file = { format: 'bite-trainer-progress', formatVersion: 1, exportedAt: 0, events }
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) })
  await page.getByText('Imported: 1 new').waitFor()
}
/** What a phone does when the installed app is brought back from the background: no reload, just a resume. */
const resume = (page: Page) => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

test('the home screen left open overnight knows it is tomorrow when the app is resumed — no reload needed', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-09-19T20:00:00') })
  await page.goto('./')
  await importCompletedSession(page, '2026-09-19T19:00:00')
  await expect(page.getByText('Done for today')).toBeVisible()

  await page.clock.fastForward('14:00:00') // 10:00 the next morning
  await resume(page)

  await expect(page.getByRole('button', { name: /Start Session/ })).toBeVisible()
  await expect(page.getByText('Done for today')).toHaveCount(0)
  await expect(page.getByText('Streak: 1 day')).toBeVisible() // yesterday still counts until today ends
})

test('a missed day ends the Streak on screen without a reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-19T20:00:00') })
  await page.goto('./')
  await importCompletedSession(page, '2026-09-19T19:00:00')
  await expect(page.getByText('Streak: 1 day')).toBeVisible()

  await page.clock.fastForward(62 * 3_600_000) // two and a half days later
  await resume(page)

  await expect(page.getByText('Streak: 0 days')).toBeVisible()
})

test('a tab left in the foreground across midnight catches up by itself within a minute', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-19T23:59:30') })
  await page.goto('./')
  await importCompletedSession(page, '2026-09-19T19:00:00')
  await expect(page.getByText('Done for today')).toBeVisible()

  await page.clock.runFor(90_000) // 00:01:00, nobody touched anything

  await expect(page.getByRole('button', { name: /Start Session/ })).toBeVisible()
})
