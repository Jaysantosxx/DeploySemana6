import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'carregando') {
    return <p className="status">Verificando sessão...</p>;
  }

  if (status !== 'autenticado') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;