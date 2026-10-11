import { API_BASE_URL } from '../config.js';

async function requisitar(caminho, options = {}) {
  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    const erroRede = new Error('Não foi possível conectar ao servidor.');
    erroRede.status = 0;
    throw erroRede;
  }

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const erro = new Error(corpo.message ?? `Erro HTTP ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }

  return corpo;
}

/** POST /api/auth/login -> { token, user } */
export function login(email, senha) {
  return requisitar('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

/** GET /api/auth/me -> { user }. Envia o token no cabeçalho Authorization. */
export function buscarUsuarioAtual(token) {
  return requisitar('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
