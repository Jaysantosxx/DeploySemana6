import './env.js';
import express, { type ErrorRequestHandler, type Request, type RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { query, type Queryable, withTransaction } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) throw new Error('Defina JWT_SECRET no ambiente.');
const LOAN_DAYS = Number(process.env.LOAN_DAYS ?? 14);
if (!Number.isSafeInteger(LOAN_DAYS) || LOAN_DAYS < 1) {
  throw new Error('LOAN_DAYS deve ser um número inteiro positivo.');
}
const MAX_LOANS = 5;
const DAY = 86400000;

class HttpError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const clean = (value: string) => value.replace(/[<>]/g, '').trim();
const text = (min: number, max: number, message: string) =>
  z.string().transform(clean).pipe(z.string().min(min, message).max(max, message));

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? 'Dados inválidos.');
  return result.data;
}

const keySchema = z.string().regex(/^\/works\/OL\d+W$/, 'Livro inválido.');
const bookRef = z.object({ key: keySchema, title: text(1, 300, 'Título inválido.') });
const registerSchema = z.object({
  name: text(2, 60, 'Informe um nome válido.'),
  email: z.string().transform((value) => clean(value).toLowerCase())
    .pipe(z.string().email('E-mail inválido.').max(100)),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.').max(100),
});
const loginSchema = z.object({ email: z.string().max(100), password: z.string().max(100) });
const shelfSchema = z.object({
  book: z.object({
    key: keySchema,
    title: text(1, 300, 'Título inválido.'),
    author: text(0, 300, 'Autor inválido.'),
    year: z.number().int().optional(),
    coverId: z.number().int().optional(),
    subjects: z.array(text(0, 100, 'Assunto inválido.')).max(10),
    popularity: z.number().default(0),
  }),
  status: z.enum(['Lendo', 'Concluído', 'Lista de desejos']).nullable(),
});

const LOAN = `id, user_id AS "userId", book_key AS "bookKey", title,
  borrowed_at AS "borrowedAt", due_at AS "dueAt", returned_at AS "returnedAt"`;
const RES = `id, user_id AS "userId", book_key AS "bookKey", title, created_at AS "createdAt"`;

type LoanRow = {
  id: string;
  bookKey: string;
  title: string;
  dueAt: string;
  returnedAt: string | null;
};
type ReservationRow = {
  id: string;
  userId: string;
  bookKey: string;
  title: string;
  createdAt: string;
};
type ShelfRow = {
  userId: string;
  book: { key: string; title: string };
  status: string;
  updatedAt: string;
};

function copiesOf(key: string) {
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return 1 + (hash % 3);
}

async function freeCopies(key: string, executor: Queryable = { query }) {
  const result = await executor.query<{ n: number }>(
    'SELECT COUNT(*)::int AS n FROM loans WHERE book_key = $1 AND returned_at IS NULL',
    [key]
  );
  return copiesOf(key) - result.rows[0].n;
}

async function reservationQueue(key: string, executor: Queryable = { query }) {
  const result = await executor.query<ReservationRow>(
    `SELECT ${RES} FROM reservations WHERE book_key = $1 ORDER BY created_at, id`,
    [key]
  );
  return result.rows;
}

async function activeLoan(userId: string, key: string, executor: Queryable = { query }) {
  const result = await executor.query<LoanRow>(
    `SELECT ${LOAN} FROM loans WHERE user_id = $1 AND book_key = $2 AND returned_at IS NULL`,
    [userId, key]
  );
  return result.rows[0];
}

async function canBorrow(userId: string | null, key: string, executor: Queryable = { query }) {
  if (userId && await activeLoan(userId, key, executor)) return false;
  const waiting = await reservationQueue(key, executor);
  const position = userId ? waiting.findIndex((reservation) => reservation.userId === userId) : -1;
  return await freeCopies(key, executor) > (position === -1 ? waiting.length : position);
}

async function lockBorrowState(client: Queryable, userId: string, key: string) {
  const lockKeys = [`book:${key}`, `user:${userId}`].sort();
  for (const lockKey of lockKeys) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
  }
}

async function borrow(userId: string, key: string, title: string) {
  await withTransaction(async (client) => {
    await lockBorrowState(client, userId, key);
    const active = await client.query<{ n: number }>(
      'SELECT COUNT(*)::int AS n FROM loans WHERE user_id = $1 AND returned_at IS NULL',
      [userId]
    );
    if (active.rows[0].n >= MAX_LOANS) {
      throw new HttpError(409, `Limite de ${MAX_LOANS} empréstimos atingido.`);
    }
    if (!await canBorrow(userId, key, client)) throw new HttpError(409, 'Livro indisponível no momento.');
    const now = Date.now();
    await client.query(
      `INSERT INTO loans (id, user_id, book_key, title, borrowed_at, due_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        userId,
        key,
        title,
        new Date(now).toISOString(),
        new Date(now + LOAN_DAYS * DAY).toISOString(),
      ]
    );
    await client.query('DELETE FROM reservations WHERE user_id = $1 AND book_key = $2', [userId, key]);
  });
}

async function notificationsFor(
  loans: LoanRow[],
  reservations: ReservationRow[],
  shelf: ShelfRow[]
) {
  const notifications: string[] = [];
  const now = Date.now();
  for (const item of shelf) {
    if (item.status === 'Lista de desejos' && await freeCopies(item.book.key) > 0) {
      notifications.push(`📚 "${item.book.title}" (lista de desejos) está disponível para empréstimo!`);
    }
  }
  for (const reservation of reservations) {
    const waiting = await reservationQueue(reservation.bookKey);
    const position = waiting.findIndex((item) => item.id === reservation.id);
    if (position >= 0 && position < await freeCopies(reservation.bookKey)) {
      notifications.push(`✅ Sua reserva de "${reservation.title}" está pronta para empréstimo.`);
    }
  }
  for (const loan of loans) {
    if (loan.returnedAt) continue;
    const daysLeft = Math.ceil((new Date(loan.dueAt).getTime() - now) / DAY);
    if (daysLeft < 0) notifications.push(`⚠️ "${loan.title}" está atrasado!`);
    else if (daysLeft <= 2) notifications.push(`⏰ "${loan.title}" vence em ${daysLeft} dia(s).`);
  }
  return notifications;
}

function userIdFrom(request: Request): string | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    return (jwt.verify(authorization.slice(7), JWT_SECRET) as { sub: string }).sub;
  } catch {
    return null;
  }
}

const auth: RequestHandler = (request, response, next) => {
  const userId = userIdFrom(request);
  if (!userId) {
    response.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  response.locals.userId = userId;
  next();
};
const sign = (id: string) => jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '7d' });

export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '50kb' }));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/auth/register', async (request, response) => {
  const { name, email, password } = parse(registerSchema, request.body);
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await query(
      'INSERT INTO users (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, name, email, passwordHash, new Date().toISOString()]
    );
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new HttpError(409, 'E-mail já cadastrado.');
    }
    throw error;
  }
  response.status(201).json({ token: sign(id) });
});

app.post('/api/auth/login', async (request, response) => {
  const body = parse(loginSchema, request.body);
  const email = clean(body.email).toLowerCase();
  const result = await query<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  response.json({ token: sign(user.id) });
});

app.get('/api/me', auth, async (_request, response) => {
  const userId = response.locals.userId as string;
  const [userResult, loansResult, reservationsResult, shelfResult] = await Promise.all([
    query('SELECT id, name, email FROM users WHERE id = $1', [userId]),
    query<LoanRow>(`SELECT ${LOAN} FROM loans WHERE user_id = $1 ORDER BY borrowed_at`, [userId]),
    query<ReservationRow>(`SELECT ${RES} FROM reservations WHERE user_id = $1 ORDER BY created_at`, [userId]),
    query<{ book_json: ShelfRow['book']; status: string; updated_at: string }>(
      'SELECT book_json, status, updated_at FROM shelf WHERE user_id = $1 ORDER BY updated_at',
      [userId]
    ),
  ]);
  const user = userResult.rows[0];
  if (!user) throw new HttpError(401, 'Sessão inválida.');
  const shelf: ShelfRow[] = shelfResult.rows.map((row) => ({
    userId,
    book: row.book_json,
    status: row.status,
    updatedAt: row.updated_at,
  }));
  const loans = loansResult.rows;
  const reservations = reservationsResult.rows;
  response.json({
    user,
    loans,
    reservations,
    shelf,
    notifications: await notificationsFor(loans, reservations, shelf),
  });
});

app.get('/api/availability', async (request, response) => {
  const ids = String(request.query.ids ?? '').split(',').filter((id) => /^OL\d+W$/.test(id)).slice(0, 50);
  const availability: Record<string, { copies: number; free: number }> = {};
  await Promise.all(ids.map(async (id) => {
    const key = `/works/${id}`;
    availability[id] = { copies: copiesOf(key), free: await freeCopies(key) };
  }));
  response.json(availability);
});

app.get('/api/books/:id/status', async (request, response) => {
  if (!/^OL\d+W$/.test(request.params.id)) throw new HttpError(400, 'Livro inválido.');
  const key = `/works/${request.params.id}`;
  const userId = userIdFrom(request);
  const waiting = await reservationQueue(key);
  const position = userId ? waiting.findIndex((reservation) => reservation.userId === userId) : -1;
  const [free, borrowAllowed, loan] = await Promise.all([
    freeCopies(key),
    canBorrow(userId, key),
    userId ? activeLoan(userId, key) : Promise.resolve(undefined),
  ]);
  response.json({
    copies: copiesOf(key),
    free,
    canBorrow: borrowAllowed,
    myLoan: loan ?? null,
    myReservation: position >= 0 ? waiting[position] : null,
    queuePosition: position >= 0 ? position + 1 : null,
  });
});

app.post('/api/loans', auth, async (request, response) => {
  const book = parse(bookRef, request.body);
  await borrow(response.locals.userId as string, book.key, book.title);
  response.status(201).json({ ok: true });
});

app.post('/api/loans/:id/return', auth, async (request, response) => {
  const userId = response.locals.userId as string;
  const result = await withTransaction(async (client) => {
    const loan = await client.query<{ book_key: string }>(
      'SELECT book_key FROM loans WHERE id = $1 AND user_id = $2 AND returned_at IS NULL',
      [request.params.id, userId]
    );
    if (!loan.rows[0]) return false;
    await lockBorrowState(client, userId, loan.rows[0].book_key);
    await client.query(
      'UPDATE loans SET returned_at = $1 WHERE id = $2 AND user_id = $3 AND returned_at IS NULL',
      [new Date().toISOString(), request.params.id, userId]
    );
    return true;
  });
  if (!result) throw new HttpError(404, 'Empréstimo não encontrado.');
  response.json({ ok: true });
});

app.post('/api/reservations', auth, async (request, response) => {
  const userId = response.locals.userId as string;
  const book = parse(bookRef, request.body);
  try {
    await withTransaction(async (client) => {
      await lockBorrowState(client, userId, book.key);
      if (await activeLoan(userId, book.key, client)
        || (await reservationQueue(book.key, client)).some((reservation) => reservation.userId === userId)) {
        throw new HttpError(409, 'Você já tem este livro emprestado ou reservado.');
      }
      if (await canBorrow(userId, book.key, client)) {
        throw new HttpError(409, 'Há exemplar livre: faça o empréstimo direto.');
      }
      await client.query(
        'INSERT INTO reservations (id, user_id, book_key, title, created_at) VALUES ($1, $2, $3, $4, $5)',
        [randomUUID(), userId, book.key, book.title, new Date().toISOString()]
      );
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new HttpError(409, 'Você já tem este livro emprestado ou reservado.');
    }
    throw error;
  }
  response.status(201).json({ ok: true });
});

app.delete('/api/reservations/:id', auth, async (request, response) => {
  await query('DELETE FROM reservations WHERE id = $1 AND user_id = $2', [
    request.params.id,
    response.locals.userId as string,
  ]);
  response.json({ ok: true });
});

app.put('/api/shelf', auth, async (request, response) => {
  const userId = response.locals.userId as string;
  const { book, status } = parse(shelfSchema, request.body);
  if (status === null) {
    await query('DELETE FROM shelf WHERE user_id = $1 AND book_key = $2', [userId, book.key]);
  } else {
    await query(
      `INSERT INTO shelf (user_id, book_key, book_json, status, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (user_id, book_key) DO UPDATE
       SET book_json = EXCLUDED.book_json, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
      [userId, book.key, JSON.stringify(book), status, new Date().toISOString()]
    );
  }
  response.json({ ok: true });
});

const onError: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'Erro interno do servidor.' });
};
app.use(onError);
