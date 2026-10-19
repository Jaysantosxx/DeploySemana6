import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

function Cadastro() {
  const { cadastrar, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useDocumentTitle('Criar conta');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const destino = location.state?.from?.pathname ?? '/';

  if (status === 'autenticado') {
    return <Navigate to={destino} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.');
      return;
    }

    setEnviando(true);
    try {
      await cadastrar(nome.trim(), email.trim(), senha);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <section className="login-panel">
      <p className="eyebrow">Comece agora</p>
      <h2>Criar sua conta</h2>
      <p className="status cadastro-intro">
        Cadastre-se para acompanhar o clima das suas cidades.
      </p>
      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="nome">Nome</label>
        <input
          id="nome"
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          required
          maxLength={80}
        />

        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
          required
          minLength={8}
          aria-describedby="senha-ajuda"
        />
        <span id="senha-ajuda" className="campo-ajuda">
          Use pelo menos 8 caracteres.
        </span>

        <label htmlFor="confirmacao">Confirme sua senha</label>
        <input
          id="confirmacao"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(event) => setConfirmacao(event.target.value)}
          required
          minLength={8}
        />

        {erro && (
          <p role="alert" className="status status-erro">
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
      <p className="status dica-login">
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
    </section>
  );
}

export default Cadastro;
