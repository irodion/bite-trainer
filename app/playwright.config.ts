import { defineConfig, devices } from '@playwright/test'

// Runs against the production build — the service worker only exists there.
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4183/', ...devices['Pixel 7'] },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4183 --strictPort',
    url: 'http://localhost:4183/',
    reuseExistingServer: false,
  },
})
