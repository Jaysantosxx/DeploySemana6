/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from './app.js';

const credenciais = { email: 'demo@painel.com', senha: 'senha123' };

async function logar() {
  const res = await request(app).post('/api/auth/login').send(credenciais);
  return res.body.token;
}

describe('API de autenticação', () => {
  describe('POST /api/auth/login', () => {
    it('devolve token e usuário (sem dados sensíveis) com credenciais corretas', async () => {
      const res = await request(app).post('/api/auth/login').send(credenciais);

      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toEqual({ id: 1, nome: 'Usuário Demo', email: 'demo@painel.com' });
      expect(JSON.stringify(res.body)).not.toMatch(/hash|senha/i);
    });

    it('aceita e-mail em maiúsculas e com espaços', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '  DEMO@Painel.com ', senha: 'senha123' });
      expect(res.status).toBe(200);
    });

    it('responde 401 para senha errada', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ ...credenciais, senha: 'errada' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('E-mail ou senha inválidos.');
      expect(res.body.token).toBeUndefined();
    });

    it('usa a mesma mensagem para e-mail inexistente (não revela quem é cadastrado)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'outro@x.com', senha: 'senha123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('E-mail ou senha inválidos.');
    });

    it.each([
      ['corpo vazio', {}],
      ['sem senha', { email: 'demo@painel.com' }],
      ['sem e-mail', { senha: 'x' }],
      ['tipos inválidos', { email: { $ne: null }, senha: 123 }],
    ])('responde 400 para %s', async (_nome, corpo) => {
      const res = await request(app).post('/api/auth/login').send(corpo);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('devolve o usuário para um token válido', async () => {
      const token = await logar();
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('demo@painel.com');
    });

    it('responde 401 sem token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('responde 401 para esquema diferente de Bearer', async () => {
      const token = await logar();
      const res = await request(app).get('/api/auth/me').set('Authorization', `Basic ${token}`);
      expect(res.status).toBe(401);
    });

    it('responde 401 para token adulterado', async () => {
      const token = await logar();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}x`);
      expect(res.status).toBe(401);
    });

    it('responde 401 para token assinado com outro segredo', async () => {
      const falso = jwt.sign({ sub: '1' }, 'outro-segredo');
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${falso}`);
      expect(res.status).toBe(401);
    });

    it('responde 401 para token expirado', async () => {
      const expirado = jwt.sign({ sub: '1' }, 'segredo-apenas-para-desenvolvimento', {
        expiresIn: -10,
      });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expirado}`);
      expect(res.status).toBe(401);
    });
  });

  it('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rota /api desconhecida responde 404 em JSON', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });
});
