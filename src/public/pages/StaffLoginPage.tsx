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
  const isRegisterPage = location.pathname === routePaths.public.register;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading || sessionError) return <SessionStatus />;
  if (session) return <Navigate replace to={getLoginDestination(location.state?.from, session)} />;

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

  function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRegisterMessage(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setRegisterMessage(
      'Cuenta de huésped creada para demo. Ya puedes iniciar sesión cuando el portal de huésped esté conectado.',
    );
  }

  return (
    <main className="public-page-shell">
      <section className="public-page-card staff-login">
        <p className="eyebrow">{isRegisterPage ? 'Cuenta de huésped' : 'Acceso del personal'}</p>
        <h1>{isRegisterPage ? 'Crear cuenta' : 'Iniciar sesión'}</h1>
        <p className="muted">
          {isRegisterPage
            ? 'Regístrate para guardar tus datos, consultar reservas y preparar tu estancia.'
            : 'Ingresa con tu cuenta para acceder a tu área de trabajo.'}
        </p>

        <form
          className="staff-login-form"
          onSubmit={isRegisterPage ? submitRegister : submit}
          aria-busy={isSubmitting}
        >
          {isRegisterPage ? (
            <label htmlFor="guest-name">
              Nombre completo
              <input
                id="guest-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </label>
          ) : null}

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

          {isRegisterPage ? (
            <label htmlFor="guest-phone">
              Teléfono
              <input
                id="guest-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
          ) : null}

          <label htmlFor="staff-password">
            Contraseña
            <input
              id="staff-password"
              name="password"
              type="password"
              autoComplete={isRegisterPage ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              aria-describedby={error ? 'login-error' : undefined}
              aria-invalid={!!error}
            />
          </label>

          {isRegisterPage ? (
            <label htmlFor="staff-confirm-password">
              Confirmar contraseña
              <input
                id="staff-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-describedby={error ? 'login-error' : undefined}
                aria-invalid={!!error}
              />
            </label>
          ) : null}

          {error && (
            <p id="login-error" role="alert">
              {error}
            </p>
          )}
          {registerMessage && <p className="staff-login-success">{registerMessage}</p>}

          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isRegisterPage ? 'Crear cuenta' : isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="muted">
          {isRegisterPage ? (
            <>
              Ya tienes cuenta? <Link to={routePaths.public.login}>Inicia sesión</Link>
            </>
          ) : (
            <>
              Vienes como huésped? <Link to={routePaths.public.register}>Regístrate aquí</Link>
            </>
          )}
        </p>
        <Link className="button secondary" to={routePaths.public.home}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
