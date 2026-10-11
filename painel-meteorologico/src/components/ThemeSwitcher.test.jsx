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

    // Tema inicial é "claro", então o botão oferece o modo escuro
    await usuario.click(screen.getByRole('button', { name: /modo escuro/i }));
    expect(screen.getByRole('button', { name: /modo claro/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /modo claro/i }));
    expect(screen.getByRole('button', { name: /modo escuro/i })).toBeInTheDocument();
  });

  it('lança erro claro se usado fora do ThemeProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeSwitcher />)).toThrow(/ThemeProvider/);
  });
});
