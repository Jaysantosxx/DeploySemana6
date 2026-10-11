import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

function Login() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const destino = location.state?.from?.pathname ?? '/';

  if (status === 'autenticado') {
    return <Navigate to={destino} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      await login(email.trim(), senha);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <section>
      <h2>Entrar</h2>
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        {erro && (
          <p role="alert" className="status status-erro">
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="status dica-login">Demonstração: demo@painel.com / senha123</p>
    </section>
  );
}

export default Login;
