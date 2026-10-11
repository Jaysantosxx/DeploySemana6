import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { AuthProvider } from '../context/AuthProvider.jsx';

/** Simula uma resposta do fetch. */
export function respostaJson(corpo, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  };
}

/** Renderiza a árvore completa (rotas + tema + autenticação) em uma URL. */
export function renderComProvedores(ui, { rota = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ThemeProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}
