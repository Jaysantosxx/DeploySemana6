function WeatherDisplay({ dados, carregando, erro }) {
  if (carregando) {
    return <p className="status weather-state">Carregando dados meteorológicos...</p>;
  }

  if (erro) {
    return <p className="status status-erro weather-state">{erro}</p>;
  }

  if (!dados) {
    return (
      <p className="status weather-state">
        Busque uma cidade para ver a previsão do tempo.
      </p>
    );
  }

  const { name, main, weather, wind, sys } = dados;
  const descricao = weather?.[0]?.description ?? '';
  const icone = weather?.[0]?.icon;

  return (
    <div className="weather-card">
      <h2>{sys?.country ? `${name}, ${sys.country}` : name}</h2>
      <div className="weather-summary">
        {icone && (
          <img
            className="weather-icon"
            src={`https://openweathermap.org/img/wn/${icone}@2x.png`}
            alt={descricao}
          />
        )}
        <div>
          <p className="temperatura">{Math.round(main.temp)}°C</p>
          <p className="descricao">{descricao}</p>
        </div>
      </div>
      <div className="detalhes">
        <span>Sensação: {Math.round(main.feels_like)}°C</span>
        <span>Umidade: {main.humidity}%</span>
        <span>Vento: {wind.speed} m/s</span>
      </div>
    </div>
  );
}

export default WeatherDisplay;