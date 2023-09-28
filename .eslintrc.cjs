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
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort'],
  rules: {
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    // TODO disable console again, only the CLI should print to the console
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'object-shorthand': 'error',
    'prefer-const': ['error', { destructuring: 'all' }],
    'simple-import-sort/imports': 'error',
    // no-unresolved cannot resolve modules due to different extension
    'import/no-unresolved': 'off',
    'import/extensions': ['error', 'ignorePackages', { js: 'always' }],
    'import/no-default-export': 'error',
    // TODO temporarily disabled to support legacy code, re-enable
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
