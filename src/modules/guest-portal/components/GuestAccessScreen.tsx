import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LogIn, Sparkles } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { useAuth } from '@/modules/auth/components/auth-context';
import { SessionStatus } from '@/modules/auth/components/SessionStatus';
import { authService } from '@/modules/auth/services/auth-service';
import { getLoginDestination } from '@/private/routes/navigation';
import '@/public/pages/staff-login.css';

/**
 * Acceso de huésped (Issue #134): el huésped se autentica principalmente con
 * correo y contraseña contra `POST /guest/auth/login`. El acceso por código
 * (`POST /guest/auth/link`) se conserva como flujo secundario de compatibilidad.
 */
export function GuestAccessScreen() {
  const { session, isLoading, error: sessionError, loginGuest, linkGuest } = useAuth();
  const location = useLocation();
  const expired =
    (location.state as { guestExpired?: boolean } | null)?.guestExpired === true ||
    authService.isGuestAccessExpired();
  const [mode, setMode] = useState<'credentials' | 'code'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    authService.clearGuestAccessExpired();
  }, []);

  if (isLoading || sessionError) return <SessionStatus />;
  if (session) return <Navigate replace to={getLoginDestination(undefined, session)} />;

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await loginGuest({ email, password });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'No fue posible iniciar sesión como huésped.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
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
        <p className="eyebrow">
          {mode === 'credentials' ? 'Acceso de huésped' : 'Acceso secundario'}
        </p>
        <h1>{mode === 'credentials' ? 'Ingresa a tu estancia' : 'Código de reserva'}</h1>
        <p className="muted">
          {mode === 'credentials'
            ? 'Inicia sesión con tu correo electrónico y contraseña para consultar tu estancia, pedir Room Service y realizar solicitudes al hotel.'
            : 'Escribe el código temporal de vinculación que recibiste en recepción al hacer check-in.'}
        </p>
        {expired && (
          <p className="staff-login-success" role="status">
            Tu acceso venció. Ingresa de nuevo tus credenciales para continuar.
          </p>
        )}

        {mode === 'credentials' ? (
          <>
            <form
              className="staff-login-form"
              onSubmit={submitCredentials}
              aria-busy={isSubmitting}
            >
              <label htmlFor="guest-email">
                Correo electrónico
                <input
                  id="guest-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  aria-describedby={error ? 'guest-access-error' : undefined}
                  aria-invalid={!!error}
                />
              </label>

              <label htmlFor="guest-password">
                Contraseña
                <input
                  id="guest-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
                <LogIn size={16} aria-hidden="true" />
                {isSubmitting ? 'Iniciando sesión...' : 'Ingresar'}
              </button>
            </form>

            <div
              className="guest-secondary-access"
              style={{
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              }}
            >
              <p className="muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                ¿Cuentas con un código de reserva temporal entregado en recepción?
              </p>
              <button
                id="guest-toggle-code-mode"
                type="button"
                className="button secondary"
                onClick={() => {
                  setMode('code');
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                <KeyRound size={16} aria-hidden="true" />
                Ingresar con código de reserva
              </button>
            </div>
          </>
        ) : (
          <>
            <form className="staff-login-form" onSubmit={submitCode} aria-busy={isSubmitting}>
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

            <div
              className="guest-secondary-access"
              style={{
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))',
              }}
            >
              <button
                id="guest-toggle-credentials-mode"
                type="button"
                className="button secondary"
                onClick={() => {
                  setMode('credentials');
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Volver al inicio con correo y contraseña
              </button>
            </div>
          </>
        )}

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
