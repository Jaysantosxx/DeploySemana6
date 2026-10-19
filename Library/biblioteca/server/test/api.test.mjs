import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

async function reservePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

async function waitForApi(baseUrl, process, output) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`API encerrou antes de iniciar:\n${output()}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Tempo esgotado ao iniciar API:\n${output()}`);
}

test('fluxo de cadastro, autenticação, empréstimo e estante', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'library-api-test-'));
  const port = await reservePort();
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      JWT_SECRET: 'integration-test-secret',
      DB_PATH: path.join(directory, 'library.db'),
      CORS_ORIGIN: `http://localhost:${port}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  server.stdout.setEncoding('utf8').on('data', (chunk) => { logs += chunk; });
  server.stderr.setEncoding('utf8').on('data', (chunk) => { logs += chunk; });

  t.after(async () => {
    if (server.exitCode === null) {
      server.kill();
      await once(server, 'exit');
    }
    await rm(directory, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${port}/api`;
  await waitForApi(baseUrl, server, () => logs);

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
  const loanSnapshot = await fetch(`${baseUrl}/me`, { headers }).then((res) => res.json());
  assert.equal(loanSnapshot.loans.length, 1);

  const book = { key, title: 'Livro de teste', author: 'Autoria', subjects: [], popularity: 0 };
  const shelf = await fetch(`${baseUrl}/shelf`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ book, status: 'Lendo' }),
  });
  assert.equal(shelf.status, 200);
  const shelfSnapshot = await fetch(`${baseUrl}/me`, { headers }).then((res) => res.json());
  assert.equal(shelfSnapshot.shelf[0].status, 'Lendo');

  const returned = await fetch(`${baseUrl}/loans/${loanSnapshot.loans[0].id}/return`, {
    method: 'POST',
    headers,
  });
  assert.equal(returned.status, 200);
  const finalSnapshot = await fetch(`${baseUrl}/me`, { headers }).then((res) => res.json());
  assert.ok(finalSnapshot.loans[0].returnedAt);
});
