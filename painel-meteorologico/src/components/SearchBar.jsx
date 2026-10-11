import { useState, useEffect } from 'react';

function SearchBar({ valor, onValorChange, onSubmit, onSelecionarCidade, apiKey }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  useEffect(() => {
    const termo = valor.trim();

    if (termo.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSugestoes([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setCarregandoSugestoes(true);
      try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          termo
        )}&limit=5&appid=${apiKey}`;

        const resposta = await fetch(url, { signal: controller.signal });
        if (!resposta.ok) throw new Error('Falha ao buscar sugestões');

        const dados = await resposta.json();
        setSugestoes(dados);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setSugestoes([]);
        }
      } finally {
        setCarregandoSugestoes(false);
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [valor, apiKey]);

  function formatarNomeCidade(cidade) {
    const partes = [cidade.name];
    if (cidade.state) partes.push(cidade.state);
    partes.push(cidade.country);
    return partes.join(', ');
  }

  function selecionarSugestao(cidade) {
    const nomeFormatado = formatarNomeCidade(cidade);
    setSugestoes([]);
    setMostrarSugestoes(false);
    onSelecionarCidade(nomeFormatado);
  }

  return (
    <div className="search-bar-wrapper">
      <form className="search-bar" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Digite o nome de uma cidade..."
          value={valor}
          onChange={(e) => onValorChange(e.target.value)}
          onFocus={() => setMostrarSugestoes(true)}
          onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
        />
        <button type="submit">Buscar</button>
      </form>

      {mostrarSugestoes && valor.trim().length >= 2 && (
        <ul className="sugestoes-lista">
          {carregandoSugestoes && (
            <li className="sugestao-item sugestao-vazia">Buscando cidades...</li>
          )}

          {!carregandoSugestoes && sugestoes.length === 0 && (
            <li className="sugestao-item sugestao-vazia">Nenhuma cidade encontrada com esse nome.</li>
          )}

          {!carregandoSugestoes &&
            sugestoes.map((cidade) => (
              <li
                key={`${cidade.lat}-${cidade.lon}`}
                className="sugestao-item"
                onMouseDown={() => selecionarSugestao(cidade)}
              >
                {formatarNomeCidade(cidade)}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;