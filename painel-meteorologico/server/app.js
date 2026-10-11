import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * API de autenticação (RESTful) baseada em token JWT.
 *
 *   POST /api/auth/login  { email, senha } -> { token, user }
 *   GET  /api/auth/me     (Authorization: Bearer <token>) -> { user }
 *   GET  /api/health      -> { status: "ok" }
 *
 * Este mesmo app Express roda localmente (server/index.js) e como função
 * serverless na Vercel (api/index.js).
 */

const isProduction = process.env.NODE_ENV === 'production';

// Em produção o segredo DEVE vir do ambiente. O fallback existe só para
// facilitar o desenvolvimento local e os testes.
const JWT_SECRET = process.env.JWT_SECRET ?? (isProduction ? null : 'segredo-apenas-para-desenvolvimento');
if (!JWT_SECRET) {
  throw new Error('Variável de ambiente JWT_SECRET não definida.');
}

const TOKEN_EXPIRATION = process.env.JWT_EXPIRES_IN ?? '1h';

// Usuário de demonstração. Em um sistema real isto viria de um banco de
// dados; a senha nunca é guardada em texto puro, apenas o hash bcrypt.
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@painel.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'senha123';

const usuarios = [
  {
    id: 1,
    nome: 'Usuário Demo',
    email: DEMO_EMAIL,
    senhaHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
  },
];

// Hash "falso" usado para gastar o mesmo tempo quando o e-mail não existe,
// evitando revelar (por tempo de resposta) quais e-mails estão cadastrados.
const HASH_FALSO = bcrypt.hashSync('nao-importa', 10);

function usuarioPublico({ id, nome, email }) {
  return { id, nome, email };
}

function exigirAutenticacao(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token de autenticação ausente.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const usuario = usuarios.find((u) => u.id === Number(payload.sub));
    if (!usuario) throw new Error('usuário inexistente');
    req.usuario = usuario;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body ?? {};

  if (typeof email !== 'string' || typeof senha !== 'string' || !email || !senha) {
    return res.status(400).json({ message: 'Informe e-mail e senha.' });
  }

  const usuario = usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);

  if (!usuario || !senhaConfere) {
    // Mesma mensagem para e-mail inexistente e senha errada.
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }

  const token = jwt.sign({ sub: String(usuario.id) }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });

  res.json({ token, user: usuarioPublico(usuario) });
});

app.get('/api/auth/me', exigirAutenticacao, (req, res) => {
  res.json({ user: usuarioPublico(req.usuario) });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

export default app;
