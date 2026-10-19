import { useContext } from 'react';
import { AuthContext } from '../context/authContext.js';

function useAuth() {
  const contexto = useContext(AuthContext);

  if (contexto === undefined) {
    throw new Error('useAuth deve ser usado dentro de um <AuthProvider>.');
  }

  return contexto;
}

export default useAuth;