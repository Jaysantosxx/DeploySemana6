import '@testing-library/jest-dom';

beforeEach(() => {
  global.fetch = jest.fn();
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});