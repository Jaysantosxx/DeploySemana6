import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState('claro');

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