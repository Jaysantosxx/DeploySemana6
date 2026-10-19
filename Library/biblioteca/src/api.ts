import type { Book, BookDetail } from './types';

const BASE = import.meta.env.VITE_API_URL;
const COVERS = import.meta.env.VITE_COVERS_URL;

export const coverUrl = (id?: number, size: 'S' | 'M' | 'L' = 'M') =>
  id ? `${COVERS}/b/id/${id}-${size}.jpg` : '';

interface SearchDocument {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  edition_count?: number;
}

interface SearchResponse {
  docs: SearchDocument[];
  numFound: number;
}

interface WorkResponse {
  key: string;
  title: string;
  authors?: { author: { key: string } }[];
  description?: string | { value: string };
  first_publish_date?: string;
  covers?: number[];
  subjects?: string[];
}

interface AuthorResponse {
  name?: string;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').split('\r\n---')[0].trim();

export const SORTS = {
  relevance: { label: 'Relevância', api: '' },
  popular: { label: 'Popularidade', api: 'editions' },
  new: { label: 'Mais recentes', api: 'new' },
  old: { label: 'Mais antigos', api: 'old' },
  author: { label: 'Autor (A–Z)', api: '' }, // ordenado no cliente
} as const;
export type SortKey = keyof typeof SORTS;

export const CATEGORIES = [
  { value: '', label: 'Todas' },
  { value: 'fiction', label: 'Ficção' },
  { value: 'science', label: 'Ciência' },
  { value: 'history', label: 'História' },
  { value: 'fantasy', label: 'Fantasia' },
  { value: 'romance', label: 'Romance' },
  { value: 'computers', label: 'Tecnologia' },
];

export async function searchBooks(
  p: { q: string; subject: string; sort: SortKey; page: number },
  signal?: AbortSignal
): Promise<{ books: Book[]; total: number }> {
  const parts = [p.q.trim(), p.subject ? `subject:${p.subject}` : ''].filter(Boolean);
  const params = new URLSearchParams({
    q: parts.join(' ') || 'subject:fiction',
    limit: '20',
    page: String(p.page),
    fields: 'key,title,author_name,first_publish_year,cover_i,subject,edition_count',
  });
  if (SORTS[p.sort].api) params.set('sort', SORTS[p.sort].api);

  const data = await getJson<SearchResponse>(`${BASE}/search.json?${params}`, signal);
  let books: Book[] = data.docs.map((d) => ({
    key: d.key,
    title: d.title,
    author: d.author_name?.[0] ?? 'Autor desconhecido',
    year: d.first_publish_year,
    coverId: d.cover_i,
    subjects: (d.subject ?? []).slice(0, 5),
    popularity: d.edition_count ?? 0,
  }));
  if (p.sort === 'author') books = [...books].sort((a, b) => a.author.localeCompare(b.author));
  return { books, total: data.numFound };
}

export async function getBook(id: string, signal?: AbortSignal): Promise<BookDetail> {
  const w = await getJson<WorkResponse>(`${BASE}/works/${id}.json`, signal);
  const names = await Promise.all(
    (w.authors ?? []).slice(0, 3).map(async (a) => {
      try { return (await getJson<AuthorResponse>(`${BASE}${a.author.key}.json`, signal)).name; } catch { return null; }
    })
  );
  const raw = typeof w.description === 'string' ? w.description : w.description?.value ?? '';
  return {
    key: w.key,
    title: w.title,
    author: names.filter(Boolean).join(', ') || 'Autor desconhecido',
    year: parseInt(w.first_publish_date ?? '') || undefined,
    coverId: w.covers?.[0],
    subjects: (w.subjects ?? []).slice(0, 6),
    popularity: 0,
    description: stripHtml(raw) || 'Sem descrição disponível.',
  };
}