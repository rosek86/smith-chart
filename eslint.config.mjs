import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    'examples/**/dist/**',
    'artifacts/**',
    'dist/**',
    'build/**',
    'test-results/**',
    'playwright-report/**',
  ]),
  {
    files: ['**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'after-used', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-empty-function': ['error', { allow: ['constructors'] }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'classProperty',
          modifiers: ['private'],
          format: null,
          leadingUnderscore: 'forbid',
        },
        {
          selector: 'parameterProperty',
          modifiers: ['private'],
          format: null,
          leadingUnderscore: 'forbid',
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts', 'demo/**/*.ts', 'examples/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.config.{ts,mjs}', 'scripts/**/*.mjs', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
  {
    files: ['**/*.{js,mjs,ts}'],
    rules: { curly: ['error', 'all'] },
  },
]);
