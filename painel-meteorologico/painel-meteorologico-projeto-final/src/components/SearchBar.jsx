import { useState, useEffect } from 'react';

function formatarNomeCidade(cidade) {
  const partes = [cidade.name];
  if (cidade.state) partes.push(cidade.state);
  partes.push(cidade.country);
  return partes.join(', ');
}

function SearchBar({ valor, onValorChange, onSubmit, onSelecionarCidade, apiKey }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);

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

  function selecionarSugestao(cidade) {
    const nomeFormatado = formatarNomeCidade(cidade);
    setSugestoes([]);
    setMostrarSugestoes(false);
    setIndiceAtivo(-1);
    onSelecionarCidade(nomeFormatado);
  }

  // Navegação por teclado: setas movem o destaque, Enter escolhe, Esc fecha.
  function handleKeyDown(event) {
    const listaAberta = mostrarSugestoes && sugestoes.length > 0;

    if (event.key === 'ArrowDown' && listaAberta) {
      event.preventDefault();
      setIndiceAtivo((i) => (i + 1) % sugestoes.length);
    } else if (event.key === 'ArrowUp' && listaAberta) {
      event.preventDefault();
      setIndiceAtivo((i) => (i <= 0 ? sugestoes.length - 1 : i - 1));
    } else if (event.key === 'Enter' && listaAberta && indiceAtivo >= 0) {
      event.preventDefault(); // escolhe a sugestão em vez de enviar o texto digitado
      selecionarSugestao(sugestoes[indiceAtivo]);
    } else if (event.key === 'Escape') {
      setMostrarSugestoes(false);
      setIndiceAtivo(-1);
    }
  }

  const painelAberto = mostrarSugestoes && valor.trim().length >= 2;
  const temResultados = !carregandoSugestoes && sugestoes.length > 0;
  const idOpcao = (i) => `sugestao-${i}`;

  return (
    <div className="search-bar-wrapper">
      <form className="search-bar" onSubmit={onSubmit} role="search">
        <input
          type="text"
          role="combobox"
          aria-label="Cidade"
          aria-autocomplete="list"
          aria-expanded={painelAberto && temResultados}
          aria-controls="lista-sugestoes"
          aria-activedescendant={indiceAtivo >= 0 ? idOpcao(indiceAtivo) : undefined}
          autoComplete="off"
          placeholder="Digite o nome de uma cidade..."
          value={valor}
          onChange={(e) => {
            setIndiceAtivo(-1);
            onValorChange(e.target.value);
          }}
          onFocus={() => setMostrarSugestoes(true)}
          onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
          onKeyDown={handleKeyDown}
        />
        <button type="submit">Buscar</button>
      </form>

      {painelAberto && carregandoSugestoes && (
        <div className="sugestoes-lista sugestao-vazia" role="status">
          Buscando cidades...
        </div>
      )}

      {painelAberto && !carregandoSugestoes && sugestoes.length === 0 && (
        <div className="sugestoes-lista sugestao-vazia" role="status">
          Nenhuma cidade encontrada com esse nome.
        </div>
      )}

      {painelAberto && temResultados && (
        <ul className="sugestoes-lista" id="lista-sugestoes" role="listbox" aria-label="Sugestões de cidades">
          {sugestoes.map((cidade, i) => (
            <li
              key={`${cidade.lat}-${cidade.lon}`}
              id={idOpcao(i)}
              role="option"
              aria-selected={i === indiceAtivo}
              className={i === indiceAtivo ? 'sugestao-item sugestao-ativa' : 'sugestao-item'}
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