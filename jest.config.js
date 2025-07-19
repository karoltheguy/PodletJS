export default {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: [
    '<rootDir>/test/unit/**/*.test.js',
    '<rootDir>/test/e2e/**/*.test.js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/**/*.js'
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    "json-summary",
    "text",
    "lcov",
    "clover"
  ],
  testTimeout: 30000,
  verbose: true
};
