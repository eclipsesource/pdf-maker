module.exports = {
  // Do not search for configuration in parent directories
  root: true,
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    node: true,
    mocha: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort'],
  rules: {
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'object-shorthand': 'error',
    'prefer-const': ['error', { destructuring: 'all' }],
    'simple-import-sort/imports': 'error',
    'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'always' }],
    'import/no-default-export': 'error',
    // TODO temporarily disabled to support legacy code, re-enable
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  },
};
