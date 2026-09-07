import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthContext } from './auth-context';
import type { Credentials, Session } from '@/modules/auth/models/session';
import { authService, sessionStorageKey } from '@/modules/auth/services/auth-service';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const retry = useCallback(async () => {
    const current = ++requestId.current;
    setIsLoading(true);
    setSession(null);
    setError(null);
    try {
      const restored = await authService.restore();
      if (current === requestId.current) setSession(restored);
    } catch {
      if (current === requestId.current)
        setError('No se pudo recuperar la sesión. Intenta nuevamente.');
    } finally {
      if (current === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const requests = requestId;
    void retry();
    const onStorage = (event: StorageEvent) => {
      if (event.key === sessionStorageKey || event.key === null) void retry();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      ++requests.current;
      window.removeEventListener('storage', onStorage);
    };
  }, [retry]);

  const logout = useCallback(() => {
    ++requestId.current;
    setSession(null);
    setIsLoading(false);
    setError(null);
    try {
      authService.clear();
    } catch {
      setError(
        'No se pudo borrar la sesión guardada. Borra los datos de este sitio en el navegador.',
      );
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(logout, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, logout]);

  async function login(credentials: Credentials) {
    const current = ++requestId.current;
    const next = await authService.login(credentials);
    if (current !== requestId.current) return;
    authService.persist(next);
    setSession(next);
    setError(null);
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, error, login, logout, retry }}>
      {children}
    </AuthContext.Provider>
  );
}
