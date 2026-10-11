import { useTheme } from '../context/ThemeContext.jsx';

function ThemeSwitcher() {
  const { tema, alternarTema } = useTheme();

  return (
    <button className="theme-switcher" onClick={alternarTema}>
      {tema === 'claro' ? '🌙 Modo escuro' : '☀️ Modo claro'}
    </button>
  );
}

export default ThemeSwitcher;