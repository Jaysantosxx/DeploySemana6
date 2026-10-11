// Único lugar que lê variáveis de ambiente do Vite (import.meta.env).
// Isolar isso facilita os testes e evita espalhar o acesso pelo código.

export const OWM_API_KEY = import.meta.env.VITE_OWM_KEY;

// Base da API de autenticação. Vazio = mesma origem (/api/...), que é o caso
// em produção (Vercel) e em desenvolvimento (proxy do Vite).
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
