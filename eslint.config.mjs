// Lint configuration. Protected by the PreToolUse hook: fix the code, not this file.
import js from '@eslint/js';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', '.lab/**', '.evidence/**'] },
  { linterOptions: { reportUnusedDisableDirectives: 'error', noInlineConfig: true } },
  js.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      complexity: ['error', 10],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
