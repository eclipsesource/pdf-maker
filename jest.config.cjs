module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // ts-jest does not seem to handle .js extensions in relative imports
    '^(\\.\\.?\\/.*)\\.js': '$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/test'],
};
