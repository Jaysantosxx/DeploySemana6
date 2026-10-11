import { useEffect, useState } from 'react';

/**
 * Hook genérico e reutilizável para buscar dados de uma URL.
 *
 * @param {string|null} url - endereço a ser buscado. Passe null/undefined
 *   para pular a requisição (útil quando o parâmetro ainda não está pronto).
 * @param {RequestInit} [options] - opções repassadas para o fetch (headers, method, etc.)
 * @returns {{ data: any, isLoading: boolean, error: Error|null }}
 */
function useFetch(url, options) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Sem URL, não há o que buscar: limpa o estado e encerra.
    if (!url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function executarFetch() {
      setIsLoading(true);
      setError(null);

      try {
        const resposta = await fetch(url, { ...options, signal: controller.signal });

        if (!resposta.ok) {
          const erroHttp = new Error(`Erro HTTP ${resposta.status}`);
          erroHttp.status = resposta.status;
          throw erroHttp;
        }

        const json = await resposta.json();
        setData(json);
      } catch (err) {
        // Uma requisição cancelada (nova URL antes da resposta anterior
        // chegar, ou componente desmontado) não deve virar um erro visível.
        if (err.name !== 'AbortError') {
          setError(err);
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    executarFetch();

    // Cleanup: cancela a requisição em andamento caso a URL mude
    // novamente ou o componente seja desmontado antes da resposta.
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data, isLoading, error };
}

export default useFetch;