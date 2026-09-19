import { expect, test, type Page } from '@playwright/test'

const stamp = { instanceId: 'other-instance', tzOffsetMin: 0 }
const file = (events: unknown[]) => ({
  name: 'progress.json',
  mimeType: 'application/json',
  buffer: Buffer.from(
    JSON.stringify({ format: 'bite-trainer-progress', formatVersion: 1, exportedAt: Date.now(), events }),
  ),
})

async function answerOne(page: Page) {
  await page.getByRole('button', { name: /Start Session/ }).click()
  await page.locator('.keys').waitFor()
  const gutter = page.getByRole('button', { name: 'Select line 1', exact: true })
  if (await gutter.count()) await gutter.click()
  else await page.getByRole('button', { name: 'A', exact: true }).click()
  await page.getByRole('button', { name: 'Check' }).click()
  await page.getByRole('button', { name: 'Next' }).waitFor()
  await page.getByRole('button', { name: 'Leave Session' }).click()
}
const firstTopicProgress = (page: Page) => page.locator('li').first().locator('.muted')

test('a malformed progress file is refused whole: nothing is written and existing progress is untouched', async ({
  page,
}) => {
  await page.goto('./')
  await answerOne(page)
  const before = await firstTopicProgress(page).textContent()
  expect(before).toMatch(/^1\//)

  const packId = /Pack (\S+) v/.exec((await page.getByText(/events · Pack/).textContent()) ?? '')![1]
  await page.locator('input[type=file]').setInputFiles(
    file([
      { ...stamp, id: 'ok-1', type: 'session-completed', at: Date.now() - 1000, sessionId: 'elsewhere' },
      { ...stamp, id: 'poison', type: 'reset', packId, at: 'bad' },
    ]),
  )

  await expect(page.getByText(/Import refused.*event 2 \(poison\): at must be a whole number/)).toBeVisible()
  await expect(page.getByText(/^1 events/)).toBeVisible() // not even the valid first event was written
  await page.reload()
  await expect(firstTopicProgress(page)).toHaveText(before!)
})

test('a well-formed file is merged, and importing it twice adds nothing', async ({ page }) => {
  await page.goto('./')
  const events = [{ ...stamp, id: 'done-1', type: 'session-completed', at: Date.now() - 1000, sessionId: 'elsewhere' }]
  await page.locator('input[type=file]').setInputFiles(file(events))
  await expect(page.getByText('Imported: 1 new, 0 already present.')).toBeVisible()
  await expect(page.getByText('Streak: 1 day')).toBeVisible()

  await page.locator('input[type=file]').setInputFiles([])
  await page.locator('input[type=file]').setInputFiles(file(events))
  await expect(page.getByText('Imported: 0 new, 1 already present.')).toBeVisible()
})

test('a store that was already poisoned heals on launch: the bad record is set aside and progress counts again', async ({
  page,
}) => {
  await page.goto('./')
  await answerOne(page)
  const packId = /Pack (\S+) v/.exec((await page.getByText(/events · Pack/).textContent()) ?? '')![1]

  // What the review replay left behind, written straight into IndexedDB as the old build would have.
  await page.evaluate(async (packId) => {
    const db: IDBDatabase = await new Promise((r) => {
      const q = indexedDB.open('bite-trainer')
      q.onsuccess = () => r(q.result)
    })
    await new Promise((r) => {
      const tx = db.transaction('events', 'readwrite')
      tx.objectStore('events').add({ id: 'poison', instanceId: 'x', tzOffsetMin: 0, type: 'reset', packId, at: 'bad' })
      tx.oncomplete = r
    })
  }, packId)

  await page.reload()
  await expect(firstTopicProgress(page)).toHaveText(/^1\//)
  await expect(page.getByText('1 damaged event ignored')).toBeVisible()
})
