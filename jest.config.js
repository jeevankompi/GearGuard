/** @type {import('ts-jest').JestConfigWithTsJest} */
const path = require('path');
const tsJestPresetDir = path.join(__dirname, 'node_modules', 'ts-jest');

module.exports = {
  rootDir: __dirname,
  preset: tsJestPresetDir,
  testEnvironment: 'node',
  roots: ['src', 'tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  verbose: true,
  clearMocks: true,
};
