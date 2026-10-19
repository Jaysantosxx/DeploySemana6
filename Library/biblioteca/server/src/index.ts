import './env.js';
import { app } from './app.js';
import { closePool, initializeDatabase } from './db.js';

const port = Number(process.env.PORT ?? 3333);

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
}

async function start() {
  await initializeDatabase();
  const server = app.listen(port, () => console.log(`API rodando na porta ${port}`));
  const shutdown = () => {
    server.close((error) => {
      void closePool().then(() => {
        if (error) {
          console.error(error);
          process.exitCode = 1;
        }
      });
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void start().catch((error: unknown) => {
  console.error('Não foi possível iniciar a API da biblioteca.', error);
  process.exitCode = 1;
});
