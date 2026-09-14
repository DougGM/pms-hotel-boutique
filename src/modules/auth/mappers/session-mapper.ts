import type { AuthSession } from '@/shared/types/entities/session';
import { rolePermissions, type Session } from '@/modules/auth/models/session';

export function toSession(session: AuthSession): Session {
  return {
    ...session,
    role: session.user.role,
    permissions: [...rolePermissions[session.user.role]],
  };
}
