import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeSwitcher from './ThemeSwitcher.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';

describe('ThemeSwitcher', () => {
  it('alterna entre modo claro e escuro a cada clique', async () => {
    const usuario = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await usuario.click(screen.getByRole('button', { name: /modo escuro/i }));
    expect(screen.getByRole('button', { name: /modo claro/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /modo claro/i }));
    expect(screen.getByRole('button', { name: /modo escuro/i })).toBeInTheDocument();
  });

  it('lembra a escolha do usuário ao recarregar', async () => {
    const usuario = userEvent.setup();
    const { unmount } = render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );
    await usuario.click(screen.getByRole('button', { name: /modo escuro/i }));
    expect(localStorage.getItem('painel:tema')).toBe('escuro');
    unmount();

    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );
    expect(screen.getByRole('button', { name: /modo claro/i })).toBeInTheDocument();
  });

  it('sem preferência salva, respeita o tema escuro do sistema', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );
    expect(screen.getByRole('button', { name: /modo claro/i })).toBeInTheDocument();
    delete window.matchMedia;
  });

  it('lança erro claro se usado fora do ThemeProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeSwitcher />)).toThrow(/ThemeProvider/);
  });
});