import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
}

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/test-results/**',
      '**/*.d.ts',
      'web/vite.config.js',
    ],
  },
  {
    files: ['web/src/**/*.{ts,tsx}', 'web/tests/**/*.{ts,tsx}', 'extension/src/**/*.ts', 'extension/tests/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...sharedGlobals,
      },
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}', 'web/tests/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
    languageOptions: {
      globals: {
        ...sharedGlobals,
        ...globals.vitest,
      },
    },
  },
  {
    files: ['web/tests/e2e/**/*.ts'],
    languageOptions: {
      globals: {
        ...sharedGlobals,
      },
    },
  },
  {
    files: ['extension/src/**/*.ts'],
    languageOptions: {
      globals: {
        ...sharedGlobals,
        chrome: 'readonly',
      },
    },
  },
  {
    files: ['extension/build.mjs', '.github/workflows/**/*.js', '.github/workflows/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
)
