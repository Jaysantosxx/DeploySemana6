import { Link } from 'react-router-dom';
import { useApp } from '../AppContextStore';
import { idOf } from '../libraryHelpers';

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR');

export default function Loans() {
  const { myLoans, myReservations, giveBack, cancelReservation } = useApp();
  const current = myLoans.filter((l) => !l.returnedAt);
  const history = myLoans.filter((l) => l.returnedAt).reverse();

  return (
    <>
      <h1>Meus empréstimos</h1>
      {current.length === 0 ? <p className="muted">Nenhum empréstimo ativo.</p> : (
        <ul className="list">
          {current.map((l) => {
            const late = new Date(l.dueAt) < new Date();
            return (
              <li key={l.id}>
                <div>
                  <Link to={`/book/${idOf(l.bookKey)}`}>{l.title}</Link>
                  <p className={late ? 'error' : 'muted'}>{late ? 'ATRASADO · ' : ''}Devolver até {fmt(l.dueAt)}</p>
                </div>
                <button className="btn" onClick={() => giveBack(l.id)}>Devolver</button>
              </li>
            );
          })}
        </ul>
      )}

      <h2>Reservas</h2>
      {myReservations.length === 0 ? <p className="muted">Nenhuma reserva.</p> : (
        <ul className="list">
          {myReservations.map((r) => (
            <li key={r.id}>
              <Link to={`/book/${idOf(r.bookKey)}`}>{r.title}</Link>
              <button className="btn secondary" onClick={() => cancelReservation(r.id)}>Cancelar</button>
            </li>
          ))}
        </ul>
      )}

      <h2>Histórico</h2>
      {history.length === 0 ? <p className="muted">Sem histórico ainda.</p> : (
        <table>
          <thead><tr><th>Livro</th><th>Emprestado</th><th>Devolvido</th></tr></thead>
          <tbody>
            {history.map((l) => (
              <tr key={l.id}><td>{l.title}</td><td>{fmt(l.borrowedAt)}</td><td>{fmt(l.returnedAt!)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}