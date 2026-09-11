import { Link, Outlet } from 'react-router-dom';
import { routePaths } from '@/app/routes';

export function PublicLayout() {
  return (
    <>
      <Link className="button secondary" to={routePaths.public.login}>
        Personal · Iniciar sesión
      </Link>
      <Outlet />
    </>
  );
}
