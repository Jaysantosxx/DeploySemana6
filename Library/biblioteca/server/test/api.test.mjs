import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { DataType, newDb } from 'pg-mem';
import { test } from 'node:test';

test('fluxo PostgreSQL de cadastro, autenticação, empréstimo e estante', async (t) => {
  process.env.JWT_SECRET = 'integration-test-secret';
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({
    name: 'hashtext',
    args: [DataType.text],
    returns: DataType.integer,
    implementation: (value) => [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0),
  });
  memory.public.registerFunction({
    name: 'pg_advisory_xact_lock',
    args: [DataType.integer],
    returns: DataType.integer,
    implementation: () => 0,
  });
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const { configurePool, initializeDatabase, closePool } = await import('../src/db.js');
  configurePool(new MemoryPool());
  await initializeDatabase();

  const { app } = await import('../src/app.js');
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  t.after(async () => {
    server.close();
    await once(server, 'close');
    await closePool();
  });

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });

  const email = `test-${Date.now()}@example.com`;
  const register = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Pessoa Teste', email, password: 'senha123' }),
  });
  assert.equal(register.status, 201);
  const { token } = await register.json();
  assert.equal(typeof token, 'string');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const duplicate = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Pessoa Teste', email, password: 'senha123' }),
  });
  assert.equal(duplicate.status, 409);

  const concurrentEmail = `race-${Date.now()}@example.com`;
  const concurrentSignup = () => fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Conta Concorrente', email: concurrentEmail, password: 'senha123' }),
  });
  const concurrentResults = await Promise.all([concurrentSignup(), concurrentSignup()]);
  assert.deepEqual(
    concurrentResults.map((response) => response.status).sort(),
    [201, 409]
  );

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'senha123' }),
  });
  assert.equal(login.status, 200);

  const initialSnapshot = await fetch(`${baseUrl}/me`, { headers });
  assert.equal(initialSnapshot.status, 200);
  assert.equal((await initialSnapshot.json()).user.email, email);

  const key = '/works/OL45883W';
  const availability = await fetch(`${baseUrl}/availability?ids=OL45883W`);
  assert.equal(availability.status, 200);

  const loan = await fetch(`${baseUrl}/loans`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key, title: 'Livro de teste' }),
  });
  assert.equal(loan.status, 201);
  const loanSnapshot = await fetch(`${baseUrl}/me`, { headers }).then((response) => response.json());
  assert.equal(loanSnapshot.loans.length, 1);

  const book = { key, title: 'Livro de teste', author: 'Autoria', subjects: [], popularity: 0 };
  const shelf = await fetch(`${baseUrl}/shelf`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ book, status: 'Lendo' }),
  });
  assert.equal(shelf.status, 200);
  const shelfSnapshot = await fetch(`${baseUrl}/me`, { headers }).then((response) => response.json());
  assert.equal(shelfSnapshot.shelf[0].status, 'Lendo');

  const returned = await fetch(`${baseUrl}/loans/${loanSnapshot.loans[0].id}/return`, {
    method: 'POST',
    headers,
  });
  assert.equal(returned.status, 200);
  const finalSnapshot = await fetch(`${baseUrl}/me`, { headers }).then((response) => response.json());
  assert.ok(finalSnapshot.loans[0].returnedAt);
});

test('Netlify Function encaminha /api/health para o Express', async () => {
  const memory = newDb();
  const { Pool: MemoryPool } = memory.adapters.createPg();
  const { configurePool, initializeDatabase } = await import('../src/db.js');
  configurePool(new MemoryPool());
  await initializeDatabase();

  const { handler } = await import('../../netlify/functions/api.ts');
  const response = await handler({
    httpMethod: 'GET',
    path: '/.netlify/functions/api/health',
    rawUrl: 'http://localhost/.netlify/functions/api/health',
    headers: { host: 'localhost' },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
  }, {});

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true });
});
