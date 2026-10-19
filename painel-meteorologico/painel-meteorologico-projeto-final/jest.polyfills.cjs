const { TextEncoder, TextDecoder } = require('node:util');
Object.assign(globalThis, { TextEncoder, TextDecoder });
process.env.VITE_OWM_KEY = 'chave-de-teste';