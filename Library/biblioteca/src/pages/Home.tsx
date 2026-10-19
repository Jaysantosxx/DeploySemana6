import { useEffect, useState } from 'react';
import { CATEGORIES, SORTS, searchBooks, type SortKey } from '../api';
import BookCard from '../components/BookCard';
import type { Book } from '../types';
import { useApp } from '../AppContextStore';

function useDebounce<T>(value: T, ms = 500) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export default function Home() {
  const { loadAvailability } = useApp();
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [page, setPage] = useState(1);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const dq = useDebounce(q);
  const requestKey = JSON.stringify([dq, subject, sort, page]);
  const [requestResult, setRequestResult] = useState<{ key: string; error: string } | null>(null);
  const loading = requestResult?.key !== requestKey;
  const error = requestResult?.key === requestKey ? requestResult.error : '';

  useEffect(() => {
    const ac = new AbortController();
    searchBooks({ q: dq, subject, sort, page }, ac.signal)
      .then((r) => {
        if (ac.signal.aborted) return;
        setBooks((prev) => (page === 1 ? r.books : [...prev, ...r.books]));
        setTotal(r.total);
        setRequestResult({ key: requestKey, error: '' });
        void loadAvailability(r.books.map((book) => book.key), ac.signal);
      })
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name !== 'AbortError' && !ac.signal.aborted) {
          setRequestResult({ key: requestKey, error: 'Erro ao buscar livros. Tente novamente.' });
        }
      });
    return () => ac.abort();
  }, [dq, subject, sort, page, requestKey, loadAvailability]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Explore sua próxima leitura</p>
          <h1>Catálogo</h1>
          <p className="page-lead">Descubra livros, acompanhe seus empréstimos e organize sua estante.</p>
        </div>
      </div>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>Buscar por título, autor ou palavra-chave
          <input type="search" value={q} maxLength={100} onChange={(e) => {
            setPage(1);
            setQ(e.target.value.replace(/[<>]/g, ''));
          }} placeholder="Ex: Machado de Assis" />
        </label>
        <label>Categoria
          <select value={subject} onChange={(e) => {
            setPage(1);
            setSubject(e.target.value);
          }}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label>Ordenar por
          <select value={sort} onChange={(e) => {
            setPage(1);
            setSort(e.target.value as SortKey);
          }}>
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </label>
      </form>

      {error && <p role="alert" className="error">{error}</p>}
      <p aria-live="polite" className="muted">{loading && page === 1 ? 'Buscando…' : `${total.toLocaleString('pt-BR')} livros encontrados`}</p>
      <ul className="grid">{books.map((b) => <BookCard key={b.key} book={b} />)}</ul>
      {!loading && !error && books.length === 0 && (
        <p className="empty-state">Nenhum livro encontrado. Ajuste a busca ou tente outro termo.</p>
      )}
      {books.length < total && (
        <button className="btn center" disabled={loading} onClick={() => setPage((p) => p + 1)}>
          {loading ? 'Carregando…' : 'Carregar mais'}
        </button>
      )}
    </>
  );
}