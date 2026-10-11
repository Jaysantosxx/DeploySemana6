import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { TOKEN_STORAGE_KEY } from './context/AuthProvider.jsx';
import { renderComProvedores, respostaJson } from './test/utils.jsx';

const usuario = { id: 1, nome: 'Usuário Demo', email: 'demo@painel.com' };

/** Simula o backend: roteia o fetch pela URL e pelo método. */
function simularBackend({ tokenValido = 'token-123' } = {}) {
  fetch.mockImplementation(async (url, options = {}) => {
    if (url === '/api/auth/login') {
      const { email, senha } = JSON.parse(options.body);
      return email === usuario.email && senha === 'senha123'
        ? respostaJson({ token: tokenValido, user: usuario })
        : respostaJson({ message: 'E-mail ou senha inválidos.' }, { status: 401 });
    }
    if (url === '/api/auth/me') {
      return options.headers?.Authorization === `Bearer ${tokenValido}`
        ? respostaJson({ user: usuario })
        : respostaJson({ message: 'Token inválido ou expirado.' }, { status: 401 });
    }
    throw new Error(`Requisição inesperada: ${url}`);
  });
}

async function preencherLogin(user, email, senha) {
  await user.type(screen.getByLabelText(/e-mail/i), email);
  await user.type(screen.getByLabelText(/senha/i), senha);
  await user.click(screen.getByRole('button', { name: /^entrar$/i }));
}

describe('Fluxo de autenticação (integração)', () => {
  it('redireciona visitante anônimo da rota protegida para o login', async () => {
    simularBackend();
    renderComProvedores(<App />, { rota: '/' });

    expect(await screen.findByRole('heading', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/nome de uma cidade/i)).not.toBeInTheDocument();
  });

  it('faz login, salva o token e libera o painel', async () => {
    const user = userEvent.setup();
    simularBackend();
    renderComProvedores(<App />, { rota: '/login' });

    await preencherLogin(user, 'demo@painel.com', 'senha123');

    expect(await screen.findByPlaceholderText(/nome de uma cidade/i)).toBeInTheDocument();
    expect(screen.getByText(/olá, usuário demo/i)).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('token-123');

    // O login envia as credenciais como JSON via POST
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ email: 'demo@painel.com', senha: 'senha123' });
  });

  it('mostra o erro do servidor e não salva token com credenciais erradas', async () => {
    const user = userEvent.setup();
    simularBackend();
    renderComProvedores(<App />, { rota: '/login' });

    await preencherLogin(user, 'demo@painel.com', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(screen.queryByPlaceholderText(/nome de uma cidade/i)).not.toBeInTheDocument();
    // O botão volta a ficar disponível para nova tentativa
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeEnabled();
  });

  it('mostra mensagem amigável quando o servidor está inacessível', async () => {
    const user = userEvent.setup();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    renderComProvedores(<App />, { rota: '/login' });

    await preencherLogin(user, 'demo@painel.com', 'senha123');

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível conectar/i);
  });

  it('volta à página que o usuário tentou acessar antes de logar', async () => {
    const user = userEvent.setup();
    simularBackend();
    renderComProvedores(<App />, { rota: '/forecast/Recife' });

    // Barrado: cai no login
    await screen.findByRole('heading', { name: /entrar/i });
    await preencherLogin(user, 'demo@painel.com', 'senha123');

    // Depois do login volta para a previsão (que chama a API de clima, simulada aqui)
    fetch.mockImplementation(async (url) =>
      url.includes('openweathermap')
        ? respostaJson({
            name: 'Recife',
            main: { temp: 30, feels_like: 33, humidity: 70 },
            weather: [{ description: 'ensolarado', icon: '01d' }],
            wind: { speed: 3 },
          })
        : respostaJson({ user: usuario })
    );
    expect(await screen.findByRole('heading', { name: 'Recife', level: 2 })).toBeInTheDocument();
  });

  it('restaura a sessão ao recarregar, enviando o token no cabeçalho Authorization', async () => {
    simularBackend();
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-123');

    renderComProvedores(<App />, { rota: '/' });

    expect(await screen.findByPlaceholderText(/nome de uma cidade/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      })
    );
  });

  it('descarta token expirado/inválido (401) e manda para o login', async () => {
    simularBackend();
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-velho');

    renderComProvedores(<App />, { rota: '/' });

    expect(await screen.findByRole('heading', { name: /entrar/i })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('mantém o token salvo se o servidor estiver fora do ar (erro de rede)', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-123');

    renderComProvedores(<App />, { rota: '/' });

    expect(await screen.findByRole('heading', { name: /entrar/i })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('token-123');
  });

  it('faz logout: remove o token e volta a proteger o painel', async () => {
    const user = userEvent.setup();
    simularBackend();
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token-123');
    renderComProvedores(<App />, { rota: '/' });

    await user.click(await screen.findByRole('button', { name: /sair/i }));

    expect(await screen.findByRole('heading', { name: /entrar/i })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    await waitFor(() =>
      expect(screen.queryByText(/olá, usuário demo/i)).not.toBeInTheDocument()
    );
  });
});
