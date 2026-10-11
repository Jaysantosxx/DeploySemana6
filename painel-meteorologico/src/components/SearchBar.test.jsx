import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from './SearchBar.jsx';
import { respostaJson } from '../test/utils.jsx';

const sugestoesApi = [
  { name: 'Recife', state: 'Pernambuco', country: 'BR', lat: -8.05, lon: -34.88 },
  { name: 'Recife', country: 'PT', lat: 40.1, lon: -8.2 },
];

// SearchBar é um componente controlado: o pai guarda o texto digitado.
function Pai({ onSubmit = jest.fn(), onSelecionarCidade = jest.fn() }) {
  const [valor, setValor] = useState('');
  return (
    <SearchBar
      valor={valor}
      onValorChange={setValor}
      onSubmit={onSubmit}
      onSelecionarCidade={onSelecionarCidade}
      apiKey="chave-x"
    />
  );
}

function prepararUsuario() {
  jest.useFakeTimers();
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

// O componente espera 400 ms (debounce) antes de chamar a API.
async function esperarDebounce() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(400);
  });
}

describe('SearchBar', () => {
  it('não consulta a API com menos de 2 caracteres', async () => {
    const usuario = prepararUsuario();
    render(<Pai />);

    await usuario.type(screen.getByPlaceholderText(/nome de uma cidade/i), 'R');
    await esperarDebounce();

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('busca sugestões após o debounce, com a chave e o termo codificado', async () => {
    const usuario = prepararUsuario();
    fetch.mockResolvedValue(respostaJson(sugestoesApi));
    render(<Pai />);

    await usuario.type(screen.getByPlaceholderText(/nome de uma cidade/i), 'São Paulo');

    // Antes do debounce terminar, nada foi chamado
    expect(fetch).not.toHaveBeenCalled();
    await esperarDebounce();

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('geo/1.0/direct');
    expect(url).toContain(`q=${encodeURIComponent('São Paulo')}`);
    expect(url).toContain('appid=chave-x');
  });

  it('lista as sugestões formatadas como "Cidade, Estado, País"', async () => {
    const usuario = prepararUsuario();
    fetch.mockResolvedValue(respostaJson(sugestoesApi));
    render(<Pai />);

    await usuario.type(screen.getByPlaceholderText(/nome de uma cidade/i), 'Rec');
    await esperarDebounce();

    expect(await screen.findByText('Recife, Pernambuco, BR')).toBeInTheDocument();
    expect(screen.getByText('Recife, PT')).toBeInTheDocument();
  });

  it('ao clicar numa sugestão, avisa o pai e fecha a lista', async () => {
    const usuario = prepararUsuario();
    fetch.mockResolvedValue(respostaJson(sugestoesApi));
    const onSelecionarCidade = jest.fn();
    render(<Pai onSelecionarCidade={onSelecionarCidade} />);

    await usuario.type(screen.getByPlaceholderText(/nome de uma cidade/i), 'Rec');
    await esperarDebounce();
    await usuario.click(await screen.findByText('Recife, Pernambuco, BR'));

    expect(onSelecionarCidade).toHaveBeenCalledWith('Recife, Pernambuco, BR');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('mostra "nenhuma cidade" quando a API não retorna resultados', async () => {
    const usuario = prepararUsuario();
    fetch.mockResolvedValue(respostaJson([]));
    render(<Pai />);

    await usuario.type(screen.getByPlaceholderText(/nome de uma cidade/i), 'xyzxyz');
    await esperarDebounce();

    expect(await screen.findByText(/nenhuma cidade encontrada/i)).toBeInTheDocument();
  });

  it('trata falha da API como lista vazia, sem quebrar', async () => {
    const usuario = prepararUsuario();
    fetch.mockResolvedValue(respostaJson({}, { status: 500 }));
    render(<Pai />);

    await usuario.type(screen.getByPlaceholderText(/nome de uma cidade/i), 'Rec');
    await esperarDebounce();

    expect(await screen.findByText(/nenhuma cidade encontrada/i)).toBeInTheDocument();
  });

  it('dispara onSubmit ao enviar o formulário', async () => {
    const usuario = prepararUsuario();
    const onSubmit = jest.fn((e) => e.preventDefault());
    render(<Pai onSubmit={onSubmit} />);

    await usuario.click(screen.getByRole('button', { name: /buscar/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
