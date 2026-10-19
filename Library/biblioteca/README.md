# Biblioteca

**Uma biblioteca digital pessoal para descobrir livros, acompanhar empréstimos e organizar leituras.**

## Sobre

Biblioteca é uma aplicação web responsiva que combina o catálogo aberto da Open Library com uma API própria para contas, empréstimos, reservas e estantes pessoais. O catálogo e as capas são obtidos da Open Library; os dados de usuário e circulação são validados pela API Express e persistidos em PostgreSQL (Neon).

## Funcionalidades

- Pesquisa por título, autor e palavra-chave, com filtros por categoria e ordenação.
- Detalhes, descrição, autoria e capas dos livros.
- Cadastro e login com senhas protegidas por hash e sessão JWT.
- Disponibilidade de exemplares simulada, empréstimo, devolução e fila de reservas.
- Estante pessoal com listas “Lista de desejos”, “Lendo” e “Concluído”.
- Histórico e notificações de empréstimo, prazo e disponibilidade.
- Layout adaptável para celular e desktop, tema escuro do sistema, navegação por teclado e link para pular ao conteúdo.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | React, TypeScript, Vite, React Router |
| API | Node.js, Express 5, TypeScript, Netlify Functions |
| Persistência | PostgreSQL com `pg` (Neon) |
| Segurança | JWT, bcrypt, Zod, Helmet, limitação de tentativas de autenticação |
| Catálogo | Open Library Search, Works e Covers APIs |

## Requisitos

- Node.js 20.19+ ou 22.12+ e npm.
- Acesso à internet para consultar o catálogo e as capas da Open Library.
- Uma base PostgreSQL (por exemplo, Neon), local ou hospedada.

## Executar localmente

Na raiz `Library/biblioteca`, instale as dependências do frontend/API e as ferramentas locais do servidor:

```powershell
npm install
npm --prefix server install
```

Se `server/.env` já existir, **edite-o sem substituir o arquivo** e adicione `DATABASE_URL` com uma connection string PostgreSQL válida (por exemplo, a URL pooled do Neon). Preserve as demais variáveis locais e confira que `JWT_SECRET` está definido. Se o arquivo ainda não existir, copie `server/.env.example` para `server/.env`, depois substitua os valores de exemplo. O arquivo `.env` é ignorado pelo Git. O esquema é criado automaticamente quando a API inicia. Nunca cole credenciais reais no repositório, em comandos compartilhados ou no chat.

O erro `DATABASE_URL não definido` significa que a API não encontrou uma URL PostgreSQL válida no ambiente. Abra `server/.env`, acrescente a linha `DATABASE_URL=...` usando a connection string do seu banco e reinicie `npm run dev:server`. Não use a URL de exemplo literalmente.

Abra dois terminais na raiz do projeto:

```powershell
npm run dev:server
```

```powershell
npm run dev
```

O frontend abre em `http://localhost:5173`. O proxy do Vite encaminha `/api` para `http://localhost:3333`, sem necessidade de CORS. A API conecta à base identificada por `DATABASE_URL`.

## Variáveis de ambiente

### Backend local e Netlify Functions

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL PostgreSQL do Neon (use a URL pooled em produção e mantenha TLS habilitado). |
| `JWT_SECRET` | Sim | Segredo longo e aleatório usado para assinar sessões. |
| `LOAN_DAYS` | Não | Duração do empréstimo em dias inteiros positivos; padrão `14`. |
| `PORT` | Não | Porta do servidor local; padrão `3333`. |

### Frontend

As variáveis `VITE_API_URL` e `VITE_COVERS_URL` apontam para os serviços públicos da Open Library. Tanto em desenvolvimento (por meio do proxy Vite) quanto em produção (por meio da Function Netlify), a API usa o caminho relativo `/api` no mesmo domínio.

O arquivo `.env.example` documenta as variáveis públicas do frontend. Variáveis com prefixo `VITE_` são incorporadas ao bundle público; não armazene segredos nelas.

## API

| Método | Rota | Acesso | Finalidade |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Público | Verificação de saúde. |
| `POST` | `/api/auth/register` | Público | Criar conta e emitir token. |
| `POST` | `/api/auth/login` | Público | Autenticar e emitir token. |
| `GET` | `/api/me` | Token Bearer | Obter perfil, empréstimos, reservas, estante e notificações. |
| `GET` | `/api/availability?ids=OL…W` | Público | Consultar disponibilidade simulada. |
| `GET` | `/api/books/:id/status` | Público/token opcional | Consultar estado de um livro e da fila. |
| `POST` | `/api/loans` | Token Bearer | Emprestar exemplar. |
| `POST` | `/api/loans/:id/return` | Token Bearer | Registrar devolução. |
| `POST`, `DELETE` | `/api/reservations` | Token Bearer | Criar ou cancelar reserva. |
| `PUT` | `/api/shelf` | Token Bearer | Criar, atualizar ou remover estado de leitura. |

## Verificações

```powershell
npm run build
npm run lint
npm run test:server
npm --prefix server run build
```

O teste de integração executa a API contra um PostgreSQL em memória de teste; não precisa de Neon nem altera dados de desenvolvimento.

## Deploy na Netlify

O arquivo `netlify.toml` configura o build estático (`dist`) e a Function `netlify/functions/api.ts`. O redirect `/api/*` para a Function vem antes do fallback SPA `/*`; frontend e API compartilham domínio, sem CORS nem URL de backend separada.

Ao importar o repositório `Jaysantosxx/DeploySemana6` na Netlify, configure:

| Configuração | Valor |
| --- | --- |
| Base directory | `Library/biblioteca` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Functions directory | `netlify/functions` |

Cadastre estas variáveis de ambiente no painel da Netlify antes do deploy:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | Connection string pooled do Neon |
| `JWT_SECRET` | Segredo novo e aleatório; gere localmente e nunca o exponha |
| `LOAN_DAYS` | `14` |
| `VITE_API_URL` | `https://openlibrary.org` |
| `VITE_COVERS_URL` | `https://covers.openlibrary.org` |
| `VITE_LOAN_DAYS` | `14` |

`PORT`, `CORS_ORIGIN` e `DB_PATH` não são necessários no deploy Netlify. A Function inicializa as tabelas PostgreSQL de forma idempotente; mantenha a URL pooled do Neon e o segredo JWT somente nas variáveis protegidas do provedor. Depois do deploy, verifique `/` e `/api/health`.

Para gerar um segredo localmente sem o compartilhar:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Estrutura

```text
src/                  Interface React e páginas
src/libraryApi.ts     Cliente HTTP da API da biblioteca
server/src/           API Express, conexão PostgreSQL e esquema
server/test/          Teste de integração da API
netlify/functions/    Adaptador HTTP da API Express para Netlify Functions
netlify.toml          Build, Functions e redirects da SPA/API
docs/apresentacao.html Slides e roteiro de demonstração
```

## Créditos

Os metadados e as capas dos livros são fornecidos pela [Open Library](https://openlibrary.org/). A quantidade de exemplares e a circulação são simuladas para demonstrar as regras de uma biblioteca.