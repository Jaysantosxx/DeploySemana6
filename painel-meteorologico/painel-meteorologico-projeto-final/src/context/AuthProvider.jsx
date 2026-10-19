import { useEffect, useState } from 'react';
import { AuthContext } from './authContext.js';
import * as authApi from '../services/authApi.js';

export const TOKEN_STORAGE_KEY = 'painel:token';

function lerTokenSalvo() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function salvarToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // armazenamento indisponível (modo privado, etc.): a sessão dura só até recarregar
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(lerTokenSalvo);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (lerTokenSalvo() ? 'carregando' : 'anonimo'));

  useEffect(() => {
    if (!token || status !== 'carregando') return;

    let cancelado = false;

    authApi
      .buscarUsuarioAtual(token)
      .then(({ user: usuario }) => {
        if (cancelado) return;
        setUser(usuario);
        setStatus('autenticado');
      })
      .catch((erro) => {
        if (cancelado) return;
        if (erro.status === 401) {
          salvarToken(null);
          setToken(null);
        }
        setStatus('anonimo');
      });

    return () => {
      cancelado = true;
    };
  }, [token, status]);

  async function login(email, senha) {
    const { token: novoToken, user: usuario } = await authApi.login(email, senha);
    salvarToken(novoToken);
    setToken(novoToken);
    setUser(usuario);
    setStatus('autenticado');
  }

  async function cadastrar(nome, email, senha) {
    const { token: novoToken, user: usuario } = await authApi.cadastrar(nome, email, senha);
    salvarToken(novoToken);
    setToken(novoToken);
    setUser(usuario);
    setStatus('autenticado');
  }

  function logout() {
    salvarToken(null);
    setToken(null);
    setUser(null);
    setStatus('anonimo');
  }

  return (
    <AuthContext.Provider value={{ user, token, status, login, cadastrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}