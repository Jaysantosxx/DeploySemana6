# Biblioteca

**Uma biblioteca digital pessoal para descobrir livros, acompanhar empréstimos e organizar leituras.**

## Sobre

Biblioteca é uma aplicação web responsiva que combina o catálogo aberto da Open Library com uma API própria para contas, empréstimos, reservas e estantes pessoais. O catálogo e as capas são obtidos da Open Library; os dados de usuário e circulação são validados pela API e persistidos em SQLite.

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
| API | Node.js, Express 5, TypeScript |
| Persistência | SQLite com `better-sqlite3` |
| Segurança | JWT, bcrypt, Zod, Helmet, CORS, limitação de tentativas de autenticação |
| Catálogo | Open Library Search, Works e Covers APIs |

## Requisitos

- Node.js 20 ou superior e npm.
- Acesso à internet para consultar o catálogo e as capas da Open Library.

## Executar localmente

Na raiz `Library/biblioteca`, instale as dependências:

```powershell
npm install
npm --prefix server install
```

Crie a configuração local do backend copiando `server/.env.example` para `server/.env`. Gere um segredo próprio para `JWT_SECRET`; nunca reutilize o valor de exemplo em produção. O backend também aceita a configuração local legada em `server/src/.env`, mas `server/.env` é o caminho recomendado.

Abra dois terminais na raiz do projeto:

```powershell
npm run dev:server
```

```powershell
npm run dev
```

O frontend abre em `http://localhost:5173`. O proxy do Vite encaminha `/api` para `http://localhost:3333`. O banco é criado em `server/data/library.db`; não coloque dados reais ou esse arquivo no controle de versão.

Se o Vite escolher outra porta, atualize `CORS_ORIGIN` no arquivo do backend quando o frontend acessar a API diretamente. Pelo proxy de desenvolvimento, as requisições da interface usam a mesma origem do Vite.

## Variáveis de ambiente

### Backend (`server/.env`)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `JWT_SECRET` | Sim | Segredo longo e aleatório usado para assinar sessões. |
| `PORT` | Não | Porta HTTP; padrão `3333`. |
| `CORS_ORIGIN` | Não | Origens permitidas, separadas por vírgula; padrão local `http://localhost:5173`. |
| `LOAN_DAYS` | Não | Duração do empréstimo em dias inteiros positivos; padrão `14`. |
| `DB_PATH` | Não | Caminho do arquivo SQLite; padrão `./data/library.db`, relativo ao diretório do servidor. |
| `TRUST_PROXY_HOPS` | Não | Número de proxies confiáveis à frente da API; padrão `0`. Configure apenas quando a plataforma exigir. |

### Frontend

As variáveis `VITE_API_URL` e `VITE_COVERS_URL` apontam para os serviços públicos da Open Library. Em desenvolvimento, o frontend usa `/api` por meio do proxy do Vite. Em produção, configure `VITE_BACKEND_URL` com a URL pública completa da API, terminando em `/api`, por exemplo `https://api.exemplo.com/api`.

O arquivo `.env.example` documenta as variáveis do frontend. Variáveis com prefixo `VITE_` são incorporadas ao bundle público; não armazene segredos nelas.

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

O teste de integração inicia uma API isolada e usa um banco SQLite temporário; não altera o banco de desenvolvimento.

## Estrutura

```text
src/                  Interface React e páginas
src/libraryApi.ts     Cliente HTTP da API da biblioteca
server/src/           API Express e esquema SQLite
server/test/          Teste de integração da API
docs/apresentacao.html Slides e roteiro de demonstração
```

## Créditos

Os metadados e as capas dos livros são fornecidos pela [Open Library](https://openlibrary.org/). A quantidade de exemplares e a circulação são simuladas para demonstrar as regras de uma biblioteca.