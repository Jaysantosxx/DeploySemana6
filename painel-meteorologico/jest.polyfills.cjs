// O jsdom não expõe TextEncoder/TextDecoder, que o React Router v7 usa.
const { TextEncoder, TextDecoder } = require('node:util');

Object.assign(globalThis, { TextEncoder, TextDecoder });

// Valores de ambiente lidos via import.meta.env -> process.env (ver babel.config.cjs)
process.env.VITE_OWM_KEY = 'chave-de-teste';
