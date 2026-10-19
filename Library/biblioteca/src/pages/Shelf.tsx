import { useEffect } from 'react';
import { useApp } from '../AppContextStore';
import BookCard from '../components/BookCard';
import type { ReadStatus } from '../types';

const SECTIONS: ReadStatus[] = ['Lista de desejos', 'Lendo', 'Concluído'];

export default function Shelf() {
  const { myShelf, loadAvailability } = useApp();

  useEffect(() => {
    const controller = new AbortController();
    void loadAvailability(myShelf.map((item) => item.book.key), controller.signal);
    return () => controller.abort();
  }, [loadAvailability, myShelf]);

  return (
    <>
      <h1>Minha estante</h1>
      {SECTIONS.map((s) => {
        const items = myShelf.filter((i) => i.status === s);
        return (
          <section key={s} aria-labelledby={s}>
            <h2 id={s}>{s} ({items.length})</h2>
            {items.length === 0 ? <p className="muted">Vazio. Defina o status na página de um livro.</p>
              : <ul className="grid">{items.map((i) => <BookCard key={i.book.key} book={i.book} />)}</ul>}
          </section>
        );
      })}
    </>
  );
}