import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  // Unit tests only; e2e/ belongs to Playwright.
  test: { include: ['src/**/*.test.ts'] },
  plugins: [
    svelte(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,woff2}'], globIgnores: ['packs/**'] },
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
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
