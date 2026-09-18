import { useEffect, useState, type FormEvent } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/components/auth-context';
import { SessionStatus } from '@/modules/auth/components/SessionStatus';
import { getLoginDestination } from '@/private/routes/navigation';
import '../pages/staff-login.css';

export type PublicAuthMode = 'login' | 'register';

type PublicAuthModalProps = {
  mode: PublicAuthMode;
  onClose: () => void;
  onModeChange: (mode: PublicAuthMode) => void;
};

export function PublicAuthModal({ mode, onClose, onModeChange }: PublicAuthModalProps) {
  const { session, isLoading, error: sessionError, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = mode === 'register';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    onClose();
    navigate(getLoginDestination(location.state?.from, session), { replace: true });
  }, [location.state, navigate, onClose, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesion.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRegisterMessage(null);

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setRegisterMessage(
      'Cuenta de huesped creada para demo. Inicia sesion cuando el portal este conectado.',
    );
  }

  return (
    <div className="visitor-auth-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="visitor-auth-modal staff-login"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="visitor-auth-modal-close"
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="login-brand staff-login-brand">
          <span className="brand-mark" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <span>
            AURORA
            <small>HOTEL & RESORT</small>
          </span>
        </div>

        <p className="eyebrow">{isRegister ? 'Cuenta de huesped' : 'Acceso Aurora'}</p>
        <h1 id="visitor-auth-title">{isRegister ? 'Crear cuenta' : 'Iniciar sesion'}</h1>
        <p className="muted">
          {isRegister
            ? 'Guarda tus datos para futuras reservas y prepara tu estancia.'
            : 'Ingresa con tu cuenta para continuar hacia tu area de trabajo.'}
        </p>

        {isLoading || sessionError ? (
          <SessionStatus />
        ) : (
          <form
            className="staff-login-form"
            onSubmit={isRegister ? submitRegister : submit}
            aria-busy={isSubmitting}
          >
            {isRegister ? (
              <label htmlFor="modal-guest-name">
                Nombre completo
                <input
                  id="modal-guest-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
              </label>
            ) : null}

            <label htmlFor="modal-auth-email">
              Correo electronico
              <input
                id="modal-auth-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                aria-describedby={error ? 'modal-login-error' : undefined}
                aria-invalid={!!error}
              />
            </label>

            {isRegister ? (
              <label htmlFor="modal-guest-phone">
                Telefono
                <input
                  id="modal-guest-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
            ) : null}

            <label htmlFor="modal-auth-password">
              Contrasena
              <input
                id="modal-auth-password"
                name="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                aria-describedby={error ? 'modal-login-error' : undefined}
                aria-invalid={!!error}
              />
            </label>

            {isRegister ? (
              <label htmlFor="modal-confirm-password">
                Confirmar contrasena
                <input
                  id="modal-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-describedby={error ? 'modal-login-error' : undefined}
                  aria-invalid={!!error}
                />
              </label>
            ) : null}

            {error ? (
              <p id="modal-login-error" role="alert">
                {error}
              </p>
            ) : null}
            {registerMessage ? <p className="staff-login-success">{registerMessage}</p> : null}

            <button className="button primary" type="submit" disabled={isSubmitting}>
              {isRegister ? 'Crear cuenta' : isSubmitting ? 'Ingresando...' : 'Iniciar sesion'}
            </button>
          </form>
        )}

        <p className="muted visitor-auth-modal-switch">
          {isRegister ? 'Ya tienes cuenta?' : 'Vienes como huesped?'}{' '}
          <button
            className="visitor-inline-action"
            type="button"
            onClick={() => {
              setError(null);
              setRegisterMessage(null);
              onModeChange(isRegister ? 'login' : 'register');
            }}
          >
            {isRegister ? 'Inicia sesion' : 'Registrate aqui'}
          </button>
        </p>
      </section>
    </div>
  );
}
