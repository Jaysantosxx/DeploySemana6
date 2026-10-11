import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section>
      <h2>Página não encontrada</h2>
      <p className="status">O endereço acessado não existe neste painel.</p>
      <Link to="/" className="voltar-link">
        ← Voltar para o início
      </Link>
    </section>
  );
}

export default NotFound;
