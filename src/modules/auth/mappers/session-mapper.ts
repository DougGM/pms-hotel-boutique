import type { AuthUserDto } from '@/modules/auth/dtos/auth-user';
import { rolePermissions, type Session } from '@/modules/auth/models/session';

export function toSession(user: AuthUserDto, expiresAt: number): Session {
  return {
    user: { id: user.id, name: user.full_name, email: user.email },
    role: user.role,
    permissions: [...rolePermissions[user.role]],
    expiresAt,
  };
}
