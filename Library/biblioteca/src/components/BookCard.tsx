import { Link } from 'react-router-dom';
import { coverUrl } from '../api';
import { useApp } from '../AppContextStore';
import { idOf } from '../libraryHelpers';
import type { Book } from '../types';

export function Cover({ id, alt }: { id?: number; alt: string }) {
  return id
    ? <img src={coverUrl(id, 'M')} alt={alt} loading="lazy" decoding="async" width="160" height="240" />
    : <div className="nocover" role="img" aria-label="Sem capa">📕</div>;
}

export default function BookCard({ book }: { book: Book }) {
  const { bookStatus } = useApp();
  const status = bookStatus(book.key);
  const free = (status?.free ?? 0) > 0;
  return (
    <li className="card">
      <Link to={`/book/${idOf(book.key)}`} aria-label={`${book.title}, de ${book.author}`}>
        <Cover id={book.coverId} alt={`Capa de ${book.title}`} />
        <h3>{book.title}</h3>
        <p className="muted">{book.author}{book.year ? ` · ${book.year}` : ''}</p>
      </Link>
      <span className={status ? (free ? 'badge ok' : 'badge no') : 'badge'}>
        {status ? (free ? 'Disponível' : 'Emprestado') : 'Verificando disponibilidade…'}
      </span>
    </li>
  );
}