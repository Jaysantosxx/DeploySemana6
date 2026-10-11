function About() {
  return (
    <section>
      <h2>Sobre o Painel Meteorológico</h2>
      <p>
        Este painel permite buscar a previsão do tempo atual de qualquer
        cidade do mundo, com dados fornecidos pela API do OpenWeatherMap.
      </p>
      <p>
        A aplicação foi construída como uma Aplicação de Página Única (SPA)
        com React Router, gerenciamento de tema global via Context API e um
        hook personalizado (<code>useFetch</code>) para busca de dados.
      </p>
      <p>
        Esta página é carregada de forma preguiçosa (<em>lazy loading</em>):
        seu código só é baixado pelo navegador quando o usuário navega até a
        rota "Sobre", reduzindo o tamanho do pacote inicial da aplicação.
      </p>
    </section>
  );
}

export default About;
