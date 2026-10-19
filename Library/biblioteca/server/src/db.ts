import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const file = process.env.DB_PATH ?? './data/library.db';
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_key    TEXT NOT NULL,
  title       TEXT NOT NULL,
  borrowed_at TEXT NOT NULL,
  due_at      TEXT NOT NULL,
  returned_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_book ON loans(book_key, returned_at);

CREATE TABLE IF NOT EXISTS reservations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_key   TEXT NOT NULL,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, book_key)
);
CREATE INDEX IF NOT EXISTS idx_res_book ON reservations(book_key, created_at);

CREATE TABLE IF NOT EXISTS shelf (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_key   TEXT NOT NULL,
  book_json  TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('Lendo','Concluído','Lista de desejos')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, book_key)
);
`);