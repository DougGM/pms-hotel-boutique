import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { useAuth } from '@/modules/auth/components/auth-context';
import { SessionStatus } from '@/modules/auth/components/SessionStatus';
import { getLoginDestination } from '@/private/routes/navigation';
import './staff-login.css';

export function StaffLoginPage() {
  const { session, isLoading, error: sessionError, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading || sessionError) return <SessionStatus />;
  if (session) return <Navigate replace to={getLoginDestination(location.state?.from)} />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'No se pudo iniciar sesión. Intenta nuevamente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-page-shell">
      <section className="public-page-card staff-login">
        <p className="eyebrow">Acceso del personal</p>
        <h1>Iniciar sesión</h1>
        <p className="muted">Ingresa con tu cuenta para acceder a tu área de trabajo.</p>
        <form className="staff-login-form" onSubmit={submit} aria-busy={isSubmitting}>
          <label htmlFor="staff-email">
            Correo electrónico
            <input
              id="staff-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={!!error}
            />
          </label>
          <label htmlFor="staff-password">
            Contraseña
            <input
              id="staff-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={!!error}
            />
          </label>
          {error && (
            <p id="login-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="muted">Entorno de demostración: utiliza una cuenta de prueba.</p>
        <Link className="button secondary" to={routePaths.public.home}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
