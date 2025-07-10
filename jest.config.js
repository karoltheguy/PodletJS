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
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  testTimeout: 30000,
  verbose: true
};