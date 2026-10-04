import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Sparkles } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { useAuth } from '@/modules/auth/components/auth-context';
import { SessionStatus } from '@/modules/auth/components/SessionStatus';
import { authService } from '@/modules/auth/services/auth-service';
import { getLoginDestination } from '@/private/routes/navigation';
import '@/public/pages/staff-login.css';

/**
 * Acceso de huésped (INT-12): el huésped canjea el código de su reserva en
 * `POST /guest/auth/link`. No usa correo ni contraseña ni el login del personal;
 * el backend solo acepta el código mientras la reserva está en check-in.
 */
export function GuestAccessScreen() {
  const { session, isLoading, error: sessionError, linkGuest } = useAuth();
  const location = useLocation();
  const expired = (location.state as { guestExpired?: boolean } | null)?.guestExpired === true;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    authService.clearGuestAccessExpired();
  }, []);

  if (isLoading || sessionError) return <SessionStatus />;
  if (session) return <Navigate replace to={getLoginDestination(undefined, session)} />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await linkGuest(code);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'No fue posible validar tu código de reserva.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-page-shell">
      <section className="public-page-card staff-login">
        <Link className="login-brand staff-login-brand" to={routePaths.public.home}>
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <span>
            AURORA
            <small>HOTEL & RESORT</small>
          </span>
        </Link>
        <p className="eyebrow">Acceso de huésped</p>
        <h1>Ingresa a tu estancia</h1>
        <p className="muted">
          Escribe el código de acceso que recibiste en recepción al hacer check-in. Con él verás tu
          estancia, pedirás Room Service y harás solicitudes al hotel.
        </p>
        {expired && (
          <p className="staff-login-success" role="status">
            Tu acceso venció. Ingresa de nuevo tu código para continuar.
          </p>
        )}

        <form className="staff-login-form" onSubmit={submit} aria-busy={isSubmitting}>
          <label htmlFor="guest-link-code">
            Código de acceso
            <input
              id="guest-link-code"
              name="code"
              type="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={isSubmitting}
              aria-describedby={error ? 'guest-access-error' : undefined}
              aria-invalid={!!error}
            />
          </label>

          {error && (
            <p id="guest-access-error" role="alert">
              {error}
            </p>
          )}

          <button className="button primary" type="submit" disabled={isSubmitting}>
            <KeyRound size={16} aria-hidden="true" />
            {isSubmitting ? 'Validando...' : 'Ingresar'}
          </button>
        </form>

        <p className="muted">
          ¿Eres parte del personal? <Link to={routePaths.public.login}>Inicia sesión aquí</Link>
        </p>
        <Link className="button secondary" to={routePaths.public.home}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
