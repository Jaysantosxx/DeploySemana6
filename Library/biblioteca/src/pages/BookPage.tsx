import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getBook } from '../api';
import { useApp } from '../AppContextStore';
import { Cover } from '../components/BookCard';
import type { BookDetail, ReadStatus } from '../types';

const STATUSES: ReadStatus[] = ['Lista de desejos', 'Lendo', 'Concluído'];

export default function BookPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const app = useApp();
  const { loadBookStatus } = app;
  const [result, setResult] = useState<{
    id: string;
    book?: BookDetail;
    error?: string;
  } | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    Promise.all([
      getBook(id, ac.signal),
      loadBookStatus(`/works/${id}`),
    ])
      .then(([details]) => {
        if (!ac.signal.aborted) setResult({ id, book: details });
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name !== 'AbortError' && !ac.signal.aborted) {
          setResult({ id, error: 'Não foi possível carregar o livro.' });
        }
      });
    return () => ac.abort();
  }, [id, loadBookStatus]);

  const currentResult = result?.id === id ? result : null;
  const book = currentResult?.book;
  if (currentResult?.error) return <p role="alert" className="error">{currentResult.error}</p>;
  if (!book) return <p>Carregando…</p>;

  const free = app.freeCopies(book.key);
  const status = app.bookStatus(book.key);
  const loan = app.myLoan(book.key);
  const res = app.myReservation(book.key);
  const guard = async (fn: () => Promise<string | null>) => {
    if (!app.user) return nav('/login', { state: { from: location } });
    setMsg((await fn()) ?? '');
  };

  return (
    <article className="detail">
      <Link to="/">← Voltar ao catálogo</Link>
      <div className="detail-body">
        <Cover id={book.coverId} alt={`Capa de ${book.title}`} />
        <div>
          <h1>{book.title}</h1>
          <p className="muted">{book.author}{book.year ? ` · ${book.year}` : ''}</p>
          <p>{book.subjects.map((s) => <span key={s} className="tag">{s}</span>)}</p>
          <p>{book.description}</p>
          <p>
            <span className={status ? (free > 0 ? 'badge ok' : 'badge no') : 'badge'}>
              {status ? (free > 0 ? 'Disponível' : 'Emprestado') : 'Disponibilidade indisponível'}
            </span>{' '}
            {status && (
              <span className="muted">{free} de {status.copies} exemplares livres</span>
            )}
          </p>

          <div className="actions">
            {loan ? <p>📗 Você pegou este livro. Devolução até <strong>{new Date(loan.dueAt).toLocaleDateString('pt-BR')}</strong>.</p>
              : !status ? <p className="muted">{app.error ? 'Disponibilidade indisponível.' : 'Verificando disponibilidade…'}</p>
              : app.canBorrow(book.key) ? <button className="btn" onClick={() => guard(() => app.borrow(book))}>Emprestar</button>
              : res ? <button className="btn secondary" onClick={() => app.cancelReservation(res.id)}>Cancelar reserva</button>
              : <button className="btn" onClick={() => guard(() => app.reserve(book))}>Reservar</button>}
          </div>

          {app.user && (
            <label>Status de leitura
              <select value={app.statusOf(book.key) ?? ''} onChange={(e) => {
                void app.setStatus(book, (e.target.value || null) as ReadStatus | null);
              }}>
                <option value="">— Nenhum —</option>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          )}
          <p role="status" className="error">{msg}</p>
        </div>
      </div>
    </article>
  );
}