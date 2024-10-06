import eslintJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // global ignores: must be used without any other keys in the config object
    ignores: ['node_modules/', 'dist/', 'build/', 'out/', 'coverage/', '*.local', '*~'],
  },
  eslintJs.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts'],
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-constant-condition': ['error', { checkLoops: false }],
      'object-shorthand': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-useless-escape': 'error',
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': 'error',
      'no-throw-literal': 'error',
      'no-param-reassign': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'dot-notation': 'error',
      'one-var': ['error', 'never'],
      'require-await': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'simple-import-sort/imports': 'error',
      'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'always' }],
      'import/no-default-export': 'error',
      'import/no-duplicates': 'error',
    },
  },
);
