import './env';
import express, { type ErrorRequestHandler, type Request, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db } from './db';

// ---------- config ----------
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Defina JWT_SECRET no .env');
const LOAN_DAYS = Number(process.env.LOAN_DAYS ?? 14);
if (!Number.isSafeInteger(LOAN_DAYS) || LOAN_DAYS < 1) {
  throw new Error('LOAN_DAYS deve ser um número inteiro positivo.');
}
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isSafeInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0) {
  throw new Error('TRUST_PROXY_HOPS deve ser um número inteiro maior ou igual a zero.');
}
const MAX_LOANS = 5;
const DAY = 86400000;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ---------- validação ----------
const clean = (s: string) => s.replace(/[<>]/g, '').trim();
const text = (min: number, max: number, msg: string) =>
  z.string().transform(clean).pipe(z.string().min(min, msg).max(max, msg));

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message ?? 'Dados inválidos.');
  return r.data;
}

const keySchema = z.string().regex(/^\/works\/OL\d+W$/, 'Livro inválido.');
const bookRef = z.object({ key: keySchema, title: text(1, 300, 'Título inválido.') });
const registerSchema = z.object({
  name: text(2, 60, 'Informe um nome válido.'),
  email: z.string().transform((s) => clean(s).toLowerCase()).pipe(z.string().email('E-mail inválido.').max(100)),
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

// ---------- regras de negócio ----------
const LOAN = `id, user_id AS userId, book_key AS bookKey, title, borrowed_at AS borrowedAt, due_at AS dueAt, returned_at AS returnedAt`;
const RES = `id, user_id AS userId, book_key AS bookKey, title, created_at AS createdAt`;

type LoanRow = { id: string; bookKey: string; title: string; dueAt: string; returnedAt: string | null };
type ResRow = { id: string; userId: string; bookKey: string; title: string; createdAt: string };
type ShelfRow = { userId: string; book: { key: string; title: string }; status: string; updatedAt: string };

// A Open Library não informa estoque: simulamos 1 a 3 exemplares por livro.
function copiesOf(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1 + (h % 3);
}
function freeCopies(key: string) {
  const r = db.prepare('SELECT COUNT(*) AS n FROM loans WHERE book_key = ? AND returned_at IS NULL').get(key) as { n: number };
  return copiesOf(key) - r.n;
}
function queue(key: string) {
  return db.prepare(`SELECT ${RES} FROM reservations WHERE book_key = ? ORDER BY created_at, id`).all(key) as ResRow[];
}
function activeLoan(userId: string, key: string) {
  return db.prepare(`SELECT ${LOAN} FROM loans WHERE user_id = ? AND book_key = ? AND returned_at IS NULL`).get(userId, key) as LoanRow | undefined;
}
// respeita a fila: só empresta quem está na frente das cópias livres
function canBorrow(userId: string | null, key: string) {
  if (userId && activeLoan(userId, key)) return false;
  const q = queue(key);
  const pos = userId ? q.findIndex((r) => r.userId === userId) : -1;
  return freeCopies(key) > (pos === -1 ? q.length : pos);
}

const borrowTx = db.transaction((userId: string, key: string, title: string) => {
  const n = (db.prepare('SELECT COUNT(*) AS n FROM loans WHERE user_id = ? AND returned_at IS NULL').get(userId) as { n: number }).n;
  if (n >= MAX_LOANS) throw new HttpError(409, `Limite de ${MAX_LOANS} empréstimos atingido.`);
  if (!canBorrow(userId, key)) throw new HttpError(409, 'Livro indisponível no momento.');
  const now = Date.now();
  db.prepare('INSERT INTO loans (id, user_id, book_key, title, borrowed_at, due_at) VALUES (?,?,?,?,?,?)')
    .run(randomUUID(), userId, key, title, new Date(now).toISOString(), new Date(now + LOAN_DAYS * DAY).toISOString());
  db.prepare('DELETE FROM reservations WHERE user_id = ? AND book_key = ?').run(userId, key);
});

function notificationsFor(loans: LoanRow[], reservations: ResRow[], shelf: ShelfRow[]) {
  const out: string[] = [];
  const now = Date.now();
  for (const s of shelf)
    if (s.status === 'Lista de desejos' && freeCopies(s.book.key) > 0)
      out.push(`📚 "${s.book.title}" (lista de desejos) está disponível para empréstimo!`);
  for (const r of reservations)
    if (queue(r.bookKey).findIndex((x) => x.id === r.id) < freeCopies(r.bookKey))
      out.push(`✅ Sua reserva de "${r.title}" está pronta para empréstimo.`);
  for (const l of loans) {
    if (l.returnedAt) continue;
    const left = Math.ceil((new Date(l.dueAt).getTime() - now) / DAY);
    if (left < 0) out.push(`⚠️ "${l.title}" está atrasado!`);
    else if (left <= 2) out.push(`⏰ "${l.title}" vence em ${left} dia(s).`);
  }
  return out;
}

// ---------- auth ----------
function userIdFrom(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try { return (jwt.verify(h.slice(7), JWT_SECRET!) as { sub: string }).sub; } catch { return null; }
}
const auth: RequestHandler = (req, res, next) => {
  const id = userIdFrom(req);
  if (!id) { res.status(401).json({ error: 'Não autenticado.' }); return; }
  res.locals.userId = id;
  next();
};
const sign = (id: string) => jwt.sign({ sub: id }, JWT_SECRET!, { expiresIn: '7d' });

// ---------- app ----------
const app = express();
app.set('trust proxy', TRUST_PROXY_HOPS);
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}));
app.use(express.json({ limit: '50kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => { res.json({ ok: true }); });

// --- autenticação ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = parse(registerSchema, req.body);
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const registerUser = db.transaction(() => {
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw new HttpError(409, 'E-mail já cadastrado.');
    }
    db.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?,?,?,?,?)')
      .run(id, name, email, passwordHash, new Date().toISOString());
  });
  registerUser();
  res.status(201).json({ token: sign(id) });
});

app.post('/api/auth/login', async (req, res) => {
  const body = parse(loginSchema, req.body);
  const email = clean(body.email).toLowerCase();
  const u = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email) as { id: string; password_hash: string } | undefined;
  if (!u || !(await bcrypt.compare(body.password, u.password_hash))) throw new HttpError(401, 'E-mail ou senha incorretos.');
  res.json({ token: sign(u.id) });
});

// --- tudo do usuário logado em uma chamada só ---
app.get('/api/me', auth, (_req, res) => {
  const uid = res.locals.userId as string;
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(uid);
  if (!user) throw new HttpError(401, 'Sessão inválida.');
  const loans = db.prepare(`SELECT ${LOAN} FROM loans WHERE user_id = ? ORDER BY borrowed_at`).all(uid) as LoanRow[];
  const reservations = db.prepare(`SELECT ${RES} FROM reservations WHERE user_id = ? ORDER BY created_at`).all(uid) as ResRow[];
  const shelf = (db.prepare('SELECT book_json, status, updated_at FROM shelf WHERE user_id = ? ORDER BY updated_at').all(uid) as
    { book_json: string; status: string; updated_at: string }[])
    .map((r) => ({ userId: uid, book: JSON.parse(r.book_json), status: r.status, updatedAt: r.updated_at }));
  res.json({ user, loans, reservations, shelf, notifications: notificationsFor(loans, reservations, shelf) });
});

// --- disponibilidade (catálogo) ---
app.get('/api/availability', (req, res) => {
  const ids = String(req.query.ids ?? '').split(',').filter((i) => /^OL\d+W$/.test(i)).slice(0, 50);
  const out: Record<string, { copies: number; free: number }> = {};
  for (const id of ids) out[id] = { copies: copiesOf(`/works/${id}`), free: freeCopies(`/works/${id}`) };
  res.json(out);
});

// --- situação de um livro (público; se logado, inclui os dados do usuário) ---
app.get('/api/books/:id/status', (req, res) => {
  if (!/^OL\d+W$/.test(req.params.id)) throw new HttpError(400, 'Livro inválido.');
  const key = `/works/${req.params.id}`;
  const uid = userIdFrom(req);
  const q = queue(key);
  const pos = uid ? q.findIndex((r) => r.userId === uid) : -1;
  res.json({
    copies: copiesOf(key),
    free: freeCopies(key),
    canBorrow: canBorrow(uid, key),
    myLoan: uid ? activeLoan(uid, key) ?? null : null,
    myReservation: pos >= 0 ? q[pos] : null,
    queuePosition: pos >= 0 ? pos + 1 : null,
  });
});

// --- empréstimos ---
app.post('/api/loans', auth, (req, res) => {
  const b = parse(bookRef, req.body);
  borrowTx(res.locals.userId, b.key, b.title);
  res.status(201).json({ ok: true });
});

app.post('/api/loans/:id/return', auth, (req, res) => {
  const r = db.prepare('UPDATE loans SET returned_at = ? WHERE id = ? AND user_id = ? AND returned_at IS NULL')
    .run(new Date().toISOString(), req.params.id, res.locals.userId);
  if (r.changes === 0) throw new HttpError(404, 'Empréstimo não encontrado.');
  res.json({ ok: true });
});

// --- reservas ---
app.post('/api/reservations', auth, (req, res) => {
  const uid = res.locals.userId as string;
  const b = parse(bookRef, req.body);
  if (activeLoan(uid, b.key) || queue(b.key).some((r) => r.userId === uid))
    throw new HttpError(409, 'Você já tem este livro emprestado ou reservado.');
  if (canBorrow(uid, b.key)) throw new HttpError(409, 'Há exemplar livre: faça o empréstimo direto.');
  db.prepare('INSERT INTO reservations (id, user_id, book_key, title, created_at) VALUES (?,?,?,?,?)')
    .run(randomUUID(), uid, b.key, b.title, new Date().toISOString());
  res.status(201).json({ ok: true });
});

app.delete('/api/reservations/:id', auth, (req, res) => {
  db.prepare('DELETE FROM reservations WHERE id = ? AND user_id = ?').run(req.params.id, res.locals.userId);
  res.json({ ok: true });
});

// --- estante: status de leitura e lista de desejos (status null remove) ---
app.put('/api/shelf', auth, (req, res) => {
  const uid = res.locals.userId as string;
  const { book, status } = parse(shelfSchema, req.body);
  if (status === null) {
    db.prepare('DELETE FROM shelf WHERE user_id = ? AND book_key = ?').run(uid, book.key);
  } else {
    db.prepare(`INSERT INTO shelf (user_id, book_key, book_json, status, updated_at) VALUES (?,?,?,?,?)
                ON CONFLICT(user_id, book_key) DO UPDATE SET book_json = excluded.book_json, status = excluded.status, updated_at = excluded.updated_at`)
      .run(uid, book.key, JSON.stringify(book), status, new Date().toISOString());
  }
  res.json({ ok: true });
});

// ---------- erros ----------
const onError: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) { next(err); return; }
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
};
app.use(onError);

const port = Number(process.env.PORT ?? 3333);
app.listen(port, () => console.log(`API rodando em http://localhost:${port}`));