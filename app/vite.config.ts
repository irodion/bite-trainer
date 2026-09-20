import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

/** The commit this build was made from, shown on Home. A build outside a git checkout says so rather than guessing. */
function buildId(): string {
  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) ?? 'unknown'
  }
}

export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  // Unit tests only; e2e/ belongs to Playwright.
  test: { include: ['src/**/*.test.ts', 'tools/**/*.test.ts'] },
  plugins: [
    svelte(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], globIgnores: ['packs/**'] },
      manifest: {
        name: 'Bite Trainer',
        short_name: 'Bite',
        description: 'Read code for 10–15 minutes a day.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#eef1f4',
        theme_color: '#2f5fd0',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // The artwork is full-bleed with its content in the central 80%, so the same file serves as maskable.
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
