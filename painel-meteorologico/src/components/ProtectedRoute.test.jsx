import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { AuthContext } from '../context/authContext.js';

function renderizar(status) {
  return render(
    <AuthContext.Provider value={{ status, user: null, token: null }}>
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="privado" element={<p>Conteúdo secreto</p>} />
          </Route>
          <Route path="login" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('mostra a rota filha para usuário autenticado', () => {
    renderizar('autenticado');
    expect(screen.getByText('Conteúdo secreto')).toBeInTheDocument();
  });

  it('redireciona anônimos para /login', () => {
    renderizar('anonimo');
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo secreto')).not.toBeInTheDocument();
  });

  it('aguarda a validação do token antes de decidir', () => {
    renderizar('carregando');
    expect(screen.getByText(/verificando sessão/i)).toBeInTheDocument();
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument();
    expect(screen.queryByText('Conteúdo secreto')).not.toBeInTheDocument();
  });
});
