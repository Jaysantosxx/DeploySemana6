import { NavLink, Outlet } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import useAuth from '../hooks/useAuth.js';

function classeLink({ isActive }) {
  return isActive ? 'nav-link nav-link-ativo' : 'nav-link';
}

function AppLayout() {
  const { tema } = useTheme();
  const { user, status, logout } = useAuth();
  const autenticado = status === 'autenticado';

  return (
    <div className={`app ${tema}`}>
      <header className="app-header">
        <h1>Painel Meteorológico</h1>
        <ThemeSwitcher />
      </header>

      <nav className="app-nav">
        {autenticado && (
          <NavLink to="/" end className={classeLink}>
            Início
          </NavLink>
        )}
        <NavLink to="/sobre" className={classeLink}>
          Sobre
        </NavLink>

        <div className="nav-usuario">
          {autenticado ? (
            <>
              <span className="nav-usuario-nome">Olá, {user?.nome}</span>
              <button type="button" className="botao-sair" onClick={logout}>
                Sair
              </button>
            </>
          ) : (
            <NavLink to="/login" className={classeLink}>
              Entrar
            </NavLink>
          )}
        </div>
      </nav>

      <main className="app-main">
        {/* As rotas filhas (Home, ForecastDetails, About, Login) são renderizadas aqui */}
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
