module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.polyfills.cjs'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|svg|png)$': '<rootDir>/src/test/fileMock.cjs',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    'server/app.js',
    '!src/main.jsx',
    '!src/test/**',
    '!src/**/*.test.{js,jsx}',
  ],
};
