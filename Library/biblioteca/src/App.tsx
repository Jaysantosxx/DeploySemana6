import { lazy, Suspense, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './AppContextStore';

const Home = lazy(() => import('./pages/Home'));
const BookPage = lazy(() => import('./pages/BookPage'));
const Loans = lazy(() => import('./pages/Loans'));
const Shelf = lazy(() => import('./pages/Shelf'));
const Login = lazy(() => import('./pages/Login'));

function Private({ children }: { children: ReactNode }) {
  const { user, authReady } = useApp();
  const location = useLocation();
  if (!authReady) return <p className="muted">Restaurando sessão…</p>;
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: location }} />;
}

export default function App() {
  const { user, logout, notifications, error, dismissError } = useApp();
  return (
    <>
      <a className="skip" href="#main">Pular para o conteúdo</a>
      <header className="header">
        <Link to="/" className="logo">📖 Biblioteca</Link>
        <nav aria-label="Principal">
          <NavLink to="/">Catálogo</NavLink>
          {user && <NavLink to="/loans">Empréstimos</NavLink>}
          {user && <NavLink to="/shelf">Estante</NavLink>}
          {user ? <button onClick={logout}>Sair ({user.name.split(' ')[0]})</button> : <NavLink to="/login">Entrar</NavLink>}
        </nav>
      </header>
      {notifications.length > 0 && (
        <div className="notice" role="status" aria-live="polite">
          {notifications.map((n) => <p key={n}>{n}</p>)}
        </div>
      )}
      {error && (
        <div className="notice error-notice" role="alert">
          <p>{error}</p>
          <button type="button" className="link" onClick={dismissError}>Fechar</button>
        </div>
      )}
      <main id="main" className="container">
        <Suspense fallback={<p>Carregando…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book/:id" element={<BookPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/loans" element={<Private><Loans /></Private>} />
            <Route path="/shelf" element={<Private><Shelf /></Private>} />
            <Route path="*" element={<p>Página não encontrada.</p>} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}