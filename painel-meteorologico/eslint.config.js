import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Back-end (Node)
    files: ['server/**/*.js', 'api/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Arquivos de configuração (CommonJS)
    files: ['**/*.cjs'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
  {
    // Testes (Jest)
    files: ['**/*.test.{js,jsx}', 'jest.setup.js', 'src/test/**'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
