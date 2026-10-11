
function WeatherDisplay({ dados, carregando, erro }) {
  if (carregando) {
    return <p className="status">Carregando dados meteorológicos...</p>;
  }

  if (erro) {
    return <p className="status status-erro">{erro}</p>;
  }

  if (!dados) {
    return <p className="status">Busque uma cidade para ver a previsão do tempo.</p>;
  }

  const { name, main, weather, wind } = dados;
  const descricao = weather?.[0]?.description ?? '';
  const icone = weather?.[0]?.icon;

  return (
    <div className="weather-card">
      <h2>{name}</h2>
      {icone && (
        <img
          src={`https://openweathermap.org/img/wn/${icone}@2x.png`}
          alt={descricao}
        />
      )}
      <p className="temperatura">{Math.round(main.temp)}°C</p>
      <p className="descricao">{descricao}</p>
      <div className="detalhes">
        <span>Sensação: {Math.round(main.feels_like)}°C</span>
        <span>Umidade: {main.humidity}%</span>
        <span>Vento: {wind.speed} m/s</span>
      </div>
    </div>
  );
}

export default WeatherDisplay;