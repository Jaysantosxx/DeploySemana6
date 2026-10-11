import '@testing-library/jest-dom';

// Todo teste começa com fetch simulado e armazenamento limpo, para que
// nenhum teste dependa (ou vaze estado) para outro.
beforeEach(() => {
  global.fetch = jest.fn();
  // Testes do servidor rodam em ambiente Node, sem localStorage
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
