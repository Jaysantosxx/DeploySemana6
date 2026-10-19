import { render, screen } from '@testing-library/react';
import WeatherDisplay from './WeatherDisplay.jsx';

const dados = {
  name: 'Recife',
  main: { temp: 28.6, feels_like: 31.2, humidity: 74 },
  weather: [{ description: 'céu limpo', icon: '01d' }],
  wind: { speed: 4.1 },
};

describe('WeatherDisplay', () => {
  it('mostra mensagem de carregamento', () => {
    render(<WeatherDisplay carregando />);
    expect(screen.getByText(/carregando dados meteorológicos/i)).toBeInTheDocument();
  });

  it('mostra a mensagem de erro recebida', () => {
    render(<WeatherDisplay erro="Cidade não encontrada." />);
    expect(screen.getByText('Cidade não encontrada.')).toHaveClass('status-erro');
  });

  it('pede uma busca quando não há dados', () => {
    render(<WeatherDisplay dados={null} />);
    expect(screen.getByText(/busque uma cidade/i)).toBeInTheDocument();
  });

  it('prioriza carregamento sobre erro e dados', () => {
    render(<WeatherDisplay carregando erro="falha" dados={dados} />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    expect(screen.queryByText('falha')).not.toBeInTheDocument();
  });

  it('renderiza cidade, temperatura arredondada e detalhes', () => {
    render(<WeatherDisplay dados={dados} />);

    expect(screen.getByRole('heading', { name: 'Recife' })).toBeInTheDocument();
    expect(screen.getByText('29°C')).toBeInTheDocument();
    expect(screen.getByText('céu limpo')).toBeInTheDocument();
    expect(screen.getByText('Sensação: 31°C')).toBeInTheDocument();
    expect(screen.getByText('Umidade: 74%')).toBeInTheDocument();
    expect(screen.getByText('Vento: 4.1 m/s')).toBeInTheDocument();
  });

  it('mostra o ícone do clima com texto alternativo', () => {
    render(<WeatherDisplay dados={dados} />);

    const imagem = screen.getByRole('img', { name: 'céu limpo' });
    expect(imagem).toHaveAttribute('src', 'https://openweathermap.org/img/wn/01d@2x.png');
  });

  it('inclui o país no título quando a API informa', () => {
    render(<WeatherDisplay dados={{ ...dados, sys: { country: 'BR' } }} />);
    expect(screen.getByRole('heading', { name: 'Recife, BR' })).toBeInTheDocument();
  });

  it('funciona sem o bloco "weather" (sem ícone)', () => {
    render(<WeatherDisplay dados={{ ...dados, weather: undefined }} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('29°C')).toBeInTheDocument();
  });
});