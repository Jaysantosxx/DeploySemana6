import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import ForecastDetails from './pages/ForecastDetails.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import './App.css';

// Code splitting: o código da página "Sobre" só é baixado quando o
// usuário navega até a rota /sobre, e não no carregamento inicial da SPA.
const About = lazy(() => import('./pages/About.jsx'));

function App() {
  return (
    <Routes>
      {/* AppLayout é o layout compartilhado: contém o cabeçalho, a barra de
          navegação e o <Outlet /> onde as rotas filhas são renderizadas. */}
      <Route path="/" element={<AppLayout />}>
        {/* Rotas protegidas: exigem login (ProtectedRoute redireciona para /login). */}
        <Route element={<ProtectedRoute />}>
          <Route index element={<Home />} />
          <Route path="forecast/:city" element={<ForecastDetails />} />
        </Route>

        {/* Rotas públicas */}
        <Route path="login" element={<Login />} />
        <Route
          path="sobre"
          element={
            <Suspense fallback={<p className="status">Carregando página...</p>}>
              <About />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
