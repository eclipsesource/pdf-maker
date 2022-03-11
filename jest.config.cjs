module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // ts-jest does not seem to handle .js extensions in relative imports
    '^(\\.\\.?\\/.*)\\.js': '$1',
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/test'],
};
