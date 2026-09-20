import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'

test('Home names the build that is running, so a Learner and a maintainer can tell which one they have', async ({
  page,
}) => {
  const commit = execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim()
  await page.goto('./')
  await expect(page.getByText(`build ${commit}`)).toBeVisible()
})
