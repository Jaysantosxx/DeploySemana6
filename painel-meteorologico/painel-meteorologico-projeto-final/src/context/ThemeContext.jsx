import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(undefined);
const CHAVE_TEMA = 'painel:tema';

function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    if (salvo === 'claro' || salvo === 'escuro') return salvo;
  } catch {
    // armazenamento indisponível: segue para a preferência do sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      // sem persistência: o tema vale apenas para esta visita
    }
  }, [tema]);

  function alternarTema() {
    setTema((temaAtual) => (temaAtual === 'claro' ? 'escuro' : 'claro'));
  }

  return (
    <ThemeContext.Provider value={{ tema, alternarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const contexto = useContext(ThemeContext);

  if (contexto === undefined) {
    throw new Error('useTheme deve ser usado dentro de um <ThemeProvider>.');
  }

  return contexto;
}