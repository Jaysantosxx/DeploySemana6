import { Link } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle.js';

function NotFound() {
  useDocumentTitle('Página não encontrada');

  return (
    <section className="content-panel">
      <h2>Página não encontrada</h2>
      <p className="status">O endereço acessado não existe neste painel.</p>
      <Link to="/" className="voltar-link">
        ← Voltar para o início
      </Link>
    </section>
  );
}

export default NotFound;