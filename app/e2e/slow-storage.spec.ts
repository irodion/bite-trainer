import { expect, test, type Page } from '@playwright/test'

/** Make every IndexedDB transaction report completion 400 ms late, as a slow or busy device would. */
async function slowStorage(page: Page) {
  await page.addInitScript(() => {
    const original = IDBTransaction.prototype.addEventListener
    IDBTransaction.prototype.addEventListener = function (type: string, listener: any, options?: any) {
      const wrapped = type === 'complete' ? (ev: Event) => setTimeout(() => listener.call(this, ev), 400) : listener
      return original.call(this, type, wrapped, options)
    }
  })
}

async function pick(page: Page) {
  const gutter = page.getByRole('button', { name: 'Select line 1', exact: true })
  await page.locator('.keys').waitFor()
  if (await gutter.count()) await gutter.click()
  else await page.getByRole('button', { name: 'A', exact: true }).click()
}
const sizeOf = async (page: Page) =>
  Number(/(\d+) Exercise/.exec((await page.getByRole('button', { name: /Start Session/ }).textContent()) ?? '')?.[1])

test('finishing the instant the last answer is checked still earns the Streak day, even when storage is slow', async ({
  page,
}) => {
  await slowStorage(page)
  await page.goto('./')
  const total = await sizeOf(page)
  await page.getByRole('button', { name: /Start Session/ }).click()

  for (let i = 0; i < total; i++) {
    await pick(page)
    await page.getByRole('button', { name: 'Check' }).click()
    // Unhurried on every Exercise but the last, so only the final click races the write.
    if (i < total - 1) await page.waitForTimeout(700)
    await page.getByRole('button', { name: /^(Next|Finish)$/ }).click()
  }

  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible()
  await expect(page.getByText(`${total} answered`)).toBeVisible()
  await expect(page.getByText('Streak: 1 day')).toBeVisible()
})

test('racing ahead on the second-to-last Exercise does not complete the Session early', async ({ page }) => {
  await slowStorage(page)
  await page.goto('./')
  const total = await sizeOf(page)
  await page.getByRole('button', { name: /Start Session/ }).click()

  for (let i = 0; i < total - 1; i++) {
    await pick(page)
    await page.getByRole('button', { name: 'Check' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
  }
  // On the last Exercise now, unanswered. Let any pending write land, then leave.
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'Leave Session' }).click()

  await expect(page.getByRole('button', { name: /Continue Session · 1 left/ })).toBeVisible()
  await expect(page.getByText('Streak: 0 days')).toBeVisible()
})

test('when saving an answer fails, no verdict is shown and nothing is recorded; Check again retries', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.add
    let failures = 1
    IDBObjectStore.prototype.add = function (...args: any[]) {
      if (this.name === 'events' && failures-- > 0) throw new DOMException('disk full', 'QuotaExceededError')
      return original.apply(this, args as any)
    }
  })
  await page.goto('./')
  await page.getByRole('button', { name: /Start Session/ }).click()
  await pick(page)
  await page.getByRole('button', { name: 'Check' }).click()

  await expect(page.getByRole('alert')).toContainText("Couldn't save your answer")
  await expect(page.getByRole('button', { name: /^(Next|Finish)$/ })).toHaveCount(0)
  await expect(page.getByText(/^(Correct|Not quite)$/)).toHaveCount(0)

  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)

  // Exactly one attempt made it into the log.
  await page.getByRole('button', { name: 'Leave Session' }).click()
  await expect(page.getByText(/^1 events/)).toBeVisible()
})
