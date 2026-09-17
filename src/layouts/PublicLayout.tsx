import { BedDouble, Percent, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { routePaths } from '@/app/routes';

export function PublicLayout() {
  const location = useLocation();
  const isLoginPage =
    location.pathname === routePaths.public.login ||
    location.pathname === routePaths.public.register ||
    location.pathname === routePaths.public.legacyLogin;
  const activeSection = location.hash.replace('#', '') || 'habitaciones';

  return (
    <div className="visitor-page">
      {!isLoginPage ? (
        <header className="visitor-header">
          <Link className="brand visitor-brand" to={routePaths.public.home}>
            <span className="brand-mark" aria-hidden="true">
              <Sparkles size={18} />
            </span>
            <span>
              AURORA
              <small>HOTEL & RESORT</small>
            </span>
          </Link>

          <div className="visitor-tabs" role="navigation" aria-label="Secciones publicas">
            <Link
              className={`visitor-tab ${activeSection === 'habitaciones' ? 'active' : ''}`}
              to="/#habitaciones"
            >
              <BedDouble size={15} aria-hidden="true" />
              <span className="visitor-tab-label">Habitaciones</span>
            </Link>
            <Link
              className={`visitor-tab ${activeSection === 'amenidades' ? 'active' : ''}`}
              to="/#amenidades"
            >
              <Sparkles size={15} aria-hidden="true" />
              <span className="visitor-tab-label">Amenidades</span>
            </Link>
            <Link
              className={`visitor-tab ${activeSection === 'promociones' ? 'active' : ''}`}
              to="/#promociones"
            >
              <Percent size={15} aria-hidden="true" />
              <span className="visitor-tab-label">Promociones</span>
            </Link>
            <Link
              className={`visitor-tab ${activeSection === 'politicas' ? 'active' : ''}`}
              to="/#politicas"
            >
              <ShieldCheck size={15} aria-hidden="true" />
              <span className="visitor-tab-label">Políticas</span>
            </Link>
          </div>

          <nav className="visitor-auth" aria-label="Navegacion publica">
            <Link className="visitor-link" to={routePaths.public.login}>
              Iniciar sesión
            </Link>
            <Link className="button primary small" to={routePaths.public.register}>
              Registrarse
            </Link>
          </nav>
        </header>
      ) : null}
      <Outlet />
    </div>
  );
}
