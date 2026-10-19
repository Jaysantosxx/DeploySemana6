import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import ForecastDetails from './pages/ForecastDetails.jsx';
import Login from './pages/Login.jsx';
import Cadastro from './pages/Cadastro.jsx';
import NotFound from './pages/NotFound.jsx';
import './App.css';

const About = lazy(() => import('./pages/About.jsx'));

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route element={<ProtectedRoute />}>
          <Route index element={<Home />} />
          <Route path="forecast/:city" element={<ForecastDetails />} />
        </Route>

        <Route path="login" element={<Login />} />
        <Route path="cadastro" element={<Cadastro />} />
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