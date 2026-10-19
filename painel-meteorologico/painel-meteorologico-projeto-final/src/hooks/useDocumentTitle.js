import { useEffect } from 'react';

const NOME_APP = 'Painel Meteorológico';

function useDocumentTitle(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${NOME_APP}` : NOME_APP;
  }, [titulo]);
}

export default useDocumentTitle;