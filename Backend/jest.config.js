module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'controllers/**/*.js',
        'models/**/*.js',
        'middlewares/**/*.js',
        'utils/**/*.js',
        '!**/node_modules/**'
    ],
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    verbose: true,
    testTimeout: 10000,
    transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
