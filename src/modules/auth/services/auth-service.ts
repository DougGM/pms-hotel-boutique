import { mockAuthAdapter } from '@/modules/auth/adapters/mock-auth';
import { toSession } from '@/modules/auth/mappers/session-mapper';
import type { Credentials, Session } from '@/modules/auth/models/session';

export const sessionStorageKey = 'hotel-aurora.auth.v1';
const sessionDuration = 8 * 60 * 60 * 1000;

export const authService = {
  async login(credentials: Credentials): Promise<Session> {
    const user = await mockAuthAdapter.login(credentials);
    return toSession(user, Date.now() + sessionDuration);
  },
  persist(session: Session) {
    try {
      localStorage.setItem(
        sessionStorageKey,
        JSON.stringify({
          version: 1,
          userId: session.user.id,
          expiresAt: session.expiresAt,
        }),
      );
    } catch {
      throw new Error(
        'No se pudo guardar la sesión. Habilita el almacenamiento del navegador e intenta nuevamente.',
      );
    }
  },
  clear() {
    localStorage.removeItem(sessionStorageKey);
  },
  async restore(): Promise<Session | null> {
    const raw = localStorage.getItem(sessionStorageKey);
    if (!raw) return null;
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      this.clear();
      return null;
    }
    if (
      !stored ||
      stored.version !== 1 ||
      typeof stored.userId !== 'string' ||
      typeof stored.expiresAt !== 'number' ||
      !Number.isFinite(stored.expiresAt) ||
      stored.expiresAt <= Date.now() ||
      stored.expiresAt > Date.now() + sessionDuration
    ) {
      this.clear();
      return null;
    }
    const user = await mockAuthAdapter.findUser(stored.userId);
    if (!user || stored.expiresAt <= Date.now()) {
      this.clear();
      return null;
    }
    // Never restore role/permissions from browser storage.
    return toSession(user, stored.expiresAt);
  },
};
