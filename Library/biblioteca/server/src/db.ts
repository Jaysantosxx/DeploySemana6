import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
let pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.PG_POOL_MAX ?? 1),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});
let poolIsInjected = false;
let initialization: Promise<void> | undefined;

export type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[]
  ): Promise<QueryResult<T>>;
};

export function configurePool(nextPool: Pool) {
  pool = nextPool;
  poolIsInjected = true;
  initialization = undefined;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  queryText: string,
  values: unknown[] = []
) {
  return pool.query<T>(queryText, values);
}

export async function withTransaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function initializeDatabase() {
  if (!poolIsInjected && !databaseUrl) {
    throw new Error(
      'DATABASE_URL não definido. Adicione a URL do PostgreSQL ao arquivo server/.env e reinicie a API.'
    );
  }
  initialization ??= pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_key TEXT NOT NULL,
      title TEXT NOT NULL,
      borrowed_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      returned_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
    CREATE INDEX IF NOT EXISTS idx_loans_book ON loans(book_key, returned_at);
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_key TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, book_key)
    );
    CREATE INDEX IF NOT EXISTS idx_res_book ON reservations(book_key, created_at);
    CREATE TABLE IF NOT EXISTS shelf (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_key TEXT NOT NULL,
      book_json JSONB NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Lendo','Concluído','Lista de desejos')),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, book_key)
    );
  `).then(() => undefined).catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

export function closePool() {
  return pool.end();
}
