import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContextStore';

export default function Login() {
  const { login, register, user, authReady } = useApp();
  const nav = useNavigate();
  const location = useLocation();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!authReady) return <p className="muted">Restaurando sessão…</p>;
  if (user) return <Navigate to={location.state?.from?.pathname ?? '/'} replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')), pw = String(f.get('password'));
    try {
      const err = signup ? await register(String(f.get('name')), email, pw) : await login(email, pw);
      if (err) setError(err); else nav(location.state?.from?.pathname ?? '/');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h1>{signup ? 'Criar conta' : 'Entrar'}</h1>
      {signup && <label>Nome<input name="name" required minLength={2} maxLength={60} autoComplete="name" /></label>}
      <label>E-mail<input name="email" type="email" required maxLength={100} autoComplete="email" /></label>
      <label>Senha<input name="password" type="password" required minLength={6} maxLength={100} autoComplete={signup ? 'new-password' : 'current-password'} /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button className="btn" disabled={submitting}>{submitting ? 'Aguarde…' : signup ? 'Cadastrar' : 'Entrar'}</button>
      <button type="button" className="link" disabled={submitting} onClick={() => { setSignup(!signup); setError(''); }}>
        {signup ? 'Já tenho conta' : 'Criar uma conta'}
      </button>
    </form>
  );
}