import { authService as sharedAuthService } from '@/services/authService';
import { toSession } from '@/modules/auth/mappers/session-mapper';
import type { Credentials, Session } from '@/modules/auth/models/session';

export { sessionStorageKey } from '@/services/authService';

// UI facade only: persistence, tokens, fixtures and transport belong to WEB-05.
export const authService = {
  async login(credentials: Credentials, signal?: AbortSignal): Promise<Session> {
    return toSession(
      await sharedAuthService.login(credentials.email, credentials.password, signal),
    );
  },
  async restore(signal?: AbortSignal): Promise<Session | null> {
    const session = await sharedAuthService.getCurrentSession(signal);
    return session ? toSession(session) : null;
  },
  logout: () => sharedAuthService.logout(),
};
