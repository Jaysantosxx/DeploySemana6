import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch.js';
import useDocumentTitle from '../hooks/useDocumentTitle.js';
import WeatherDisplay from '../components/WeatherDisplay.jsx';
import { OWM_API_KEY as API_KEY } from '../config.js';

function mensagemDeErro(erro) {
  if (!erro) return null;
  if (erro.status === 404) {
    return 'Cidade não encontrada. Verifique o nome e tente novamente.';
  }
  if (erro.status === 401) {
    return 'Chave de API inválida ou ainda não ativada. Aguarde um pouco e tente de novo.';
  }
  return 'Não foi possível buscar o clima agora. Tente novamente em instantes.';
}

function ForecastDetails() {

  const { city } = useParams();

  const url = city
    ? `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&units=metric&lang=pt_br&appid=${API_KEY}`
    : null;

  const { data, isLoading, error } = useFetch(url);

  useDocumentTitle(city ? `Clima em ${city.split(',')[0]}` : 'Clima');

  return (
    <section>
      <Link to="/" className="voltar-link">
        ← Nova busca
      </Link>

      <WeatherDisplay dados={data} carregando={isLoading} erro={mensagemDeErro(error)} />
    </section>
  );
}

export default ForecastDetails;