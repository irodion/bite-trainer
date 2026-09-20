import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import ts from 'typescript-eslint'
import svelteConfig from './svelte.config.js'

export default ts.config(
  { ignores: ['dist/', 'dev-dist/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  { languageOptions: { globals: { ...globals.browser, ...globals.node, __BUILD_ID__: 'readonly' } } },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'], svelteConfig } },
  },
  {
    // core/ is the framework-free engine: no Svelte, no DOM-bound app modules.
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['svelte', 'svelte/*', '../*', 'idb', 'shiki', 'shiki/*'],
              message: 'core/ must stay framework-free and self-contained.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', 'e2e/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)
