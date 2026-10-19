import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import { OWM_API_KEY as API_KEY } from '../config.js';

function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useDocumentTitle('Início');

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
    <section className="home-hero">
      <p className="eyebrow">Previsão do tempo</p>
      <h2>
        O clima da sua cidade,
        <br />
        <span>em um só lugar.</span>
      </h2>
      <p className="status">
        Busque uma cidade para ver a previsão do tempo.
      </p>

      <SearchBar
        valor={query}
        onValorChange={setQuery}
        onSubmit={handleSubmit}
        onSelecionarCidade={irParaPrevisao}
        apiKey={API_KEY}
      />
      <div className="home-hint" aria-hidden="true">
        <span>✦</span> Atualizações em tempo real <span>·</span> Cidades do mundo todo
      </div>
    </section>
  );
}

export default Home;