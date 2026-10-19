import { useEffect, useState } from 'react';

/**
 * 
 *
 * @param {string|null} url 
 *   
 * @param {RequestInit} [options] 
 * @returns {{ data: any, isLoading: boolean, error: Error|null }}
 */
function useFetch(url, options) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {

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
        
        if (err.name !== 'AbortError') {
          setError(err);
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    executarFetch();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data, isLoading, error };
}

export default useFetch;