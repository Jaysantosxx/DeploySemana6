# Painel Meteorológico

SPA em React 19 + Vite que mostra o clima atual de qualquer cidade (OpenWeatherMap), agora com **autenticação por token (JWT)**, **backend próprio**, **testes automatizados** e **deploy na Vercel**.

## Rodando localmente

```bash
npm install
cp .env.example .env      # preencha VITE_OWM_KEY com a sua chave do OpenWeatherMap
npm run dev               # front (http://localhost:5173) + API (http://localhost:3001)
```

Login de demonstração: **demo@painel.com / senha123**

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe Vite e a API Express juntos (o Vite faz proxy de `/api`) |
| `npm test` | Roda todos os testes (Jest + React Testing Library) |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção em `dist/` |

## Arquitetura de autenticação

```
Login.jsx ──► AuthProvider.login() ──► POST /api/auth/login ──► { token, user }
                   │                                              (JWT, expira em 1h)
                   ├─ guarda token no localStorage ("painel:token")
                   └─ status = "autenticado"

Ao abrir/recarregar o app:  GET /api/auth/me  (Authorization: Bearer <token>)
   200 → sessão restaurada   |   401 → token descartado, vai para /login

ProtectedRoute: anônimo em "/" ou "/forecast/:city" → redireciona para /login
                (e volta à página pedida depois de logar)
Logout: apaga token + estado.
```

- **Backend** (`server/app.js`): Express + `jsonwebtoken` + `bcryptjs` (senha guardada só como hash). Mensagem de erro idêntica para e-mail inexistente e senha errada. Mesmo código roda local (`server/index.js`) e como função serverless (`api/index.js`).
- **Front**: `services/authApi.js` (chamadas HTTP), `context/AuthProvider.jsx` (estado), `hooks/useAuth.js`, `components/ProtectedRoute.jsx`, `pages/Login.jsx`.
- O token **nunca** é enviado à API do OpenWeatherMap (terceiro) — apenas ao nosso backend.

## Testes

- **Componentes:** `WeatherDisplay`, `SearchBar` (debounce com timers falsos), `ProtectedRoute`, `ThemeSwitcher`
- **Hook:** `useFetch` (sucesso, erro HTTP, erro de rede, URL nula, troca de URL, cancelamento)
- **Integração:** `auth-flow.test.jsx` — login, credenciais erradas, servidor fora do ar, redirecionamento pós-login, restauração de sessão, token expirado, logout
- **API:** `server/app.test.js` (Supertest) — login, validação, token ausente/adulterado/expirado/assinado com outro segredo

`fetch` é simulado com `jest.fn()` em todos os testes (veja `jest.setup.js`); nenhum teste acessa a internet.

## Deploy na Vercel

1. Suba o projeto para um repositório no GitHub (o `.gitignore` já exclui `.env`).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório. A Vercel detecta Vite sozinha (build `npm run build`, saída `dist`).
3. Em **Settings → Environment Variables**, cadastre:
   - `VITE_OWM_KEY` — chave do OpenWeatherMap
   - `JWT_SECRET` — string longa e aleatória (ex.: `openssl rand -hex 32`). **Obrigatória:** em produção a API se recusa a iniciar sem ela.
   - (opcional) `DEMO_EMAIL`, `DEMO_PASSWORD`, `JWT_EXPIRES_IN`
4. Clique em **Deploy**. O `vercel.json` encaminha `/api/*` para a função Express e faz o fallback de SPA para `index.html`.

Via CLI: `npm i -g vercel && vercel --prod`.

## Limitações conhecidas (e como evoluir)

- **Token no `localStorage`** é simples, mas legível por JavaScript (risco em caso de XSS). A alternativa mais segura é cookie `HttpOnly` definido pelo backend.
- O usuário é fixo em memória (demo). Em um sistema real: banco de dados, cadastro, *refresh token* e limite de tentativas de login.
- Toda chave `VITE_*` vai para o bundle do navegador. A chave do OpenWeatherMap fica visível ao usuário; para escondê-la, faça o backend intermediar essas chamadas.
