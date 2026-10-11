import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import { OWM_API_KEY as API_KEY } from '../config.js';

function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Em vez de guardar a cidade buscada em estado local, navegamos para a
  // rota dinâmica /forecast/:city — a URL passa a ser a única fonte da
  // verdade sobre qual cidade está sendo exibida.
  function irParaPrevisao(nomeCidade) {
    const nome = nomeCidade.trim();
    if (nome === '') return;
    navigate(`/forecast/${encodeURIComponent(nome)}`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    irParaPrevisao(query);
  }

  return (
    <section>
      <p className="status">Busque uma cidade para ver a previsão do tempo.</p>

      <SearchBar
        valor={query}
        onValorChange={setQuery}
        onSubmit={handleSubmit}
        onSelecionarCidade={irParaPrevisao}
        apiKey={API_KEY}
      />
    </section>
  );
}

export default Home;
