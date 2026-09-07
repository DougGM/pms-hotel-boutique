import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { useAuth } from '@/modules/auth/components/auth-context';
import { SessionStatus } from '@/modules/auth/components/SessionStatus';

export function RequireSession() {
  const { session, isLoading, error } = useAuth();
  const location = useLocation();
  if (isLoading || error) return <SessionStatus />;
  if (!session || session.expiresAt <= Date.now()) {
    return (
      <Navigate
        to={routePaths.public.login}
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    );
  }
  return <Outlet />;
}
