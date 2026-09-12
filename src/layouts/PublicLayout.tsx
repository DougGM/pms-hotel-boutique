import { BedDouble, Percent, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { routePaths } from '@/app/routes';

export function PublicLayout() {
  return (
    <div className="visitor-page">
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
          <Link className="visitor-tab active" to={routePaths.public.home}>
            <BedDouble size={15} aria-hidden="true" />
            <span className="visitor-tab-label">Habitaciones</span>
          </Link>
          <Link className="visitor-tab" to={routePaths.public.home}>
            <Sparkles size={15} aria-hidden="true" />
            <span className="visitor-tab-label">Amenidades</span>
          </Link>
          <Link className="visitor-tab" to={routePaths.public.home}>
            <Percent size={15} aria-hidden="true" />
            <span className="visitor-tab-label">Promociones</span>
          </Link>
          <Link className="visitor-tab" to={routePaths.public.home}>
            <ShieldCheck size={15} aria-hidden="true" />
            <span className="visitor-tab-label">Politicas</span>
          </Link>
        </div>

        <nav className="visitor-auth" aria-label="Navegacion publica">
          <Link className="visitor-link" to={routePaths.public.login}>
            Iniciar sesion
          </Link>
          <Link className="button primary small" to={routePaths.public.login}>
            Registrarse
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
