import type { UserRole } from '@/shared/types/common';
import type { AuthSession, LoginDTO } from '@/shared/types/entities/session';

export const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administración',
  RECEPTIONIST: 'Recepción',
  MANAGER: 'Gerencia',
  STAFF: 'Personal operativo',
};
export type StaffRole = UserRole;
export type Permission =
  | 'dashboard:view'
  | 'reception:view'
  | 'housekeeping:view'
  | 'room-service:view'
  | 'concierge:view'
  | 'cash:view'
  | 'users:view'
  | 'rooms:manage'
  | 'occupancy:view'
  | 'front-desk:operate';

export const rolePermissions: Record<UserRole, readonly Permission[]> = {
  ADMIN: [
    'dashboard:view',
    'reception:view',
    'housekeeping:view',
    'room-service:view',
    'concierge:view',
    'cash:view',
    'users:view',
    'rooms:manage',
    'occupancy:view',
    'front-desk:operate',
  ],
  RECEPTIONIST: ['dashboard:view', 'reception:view', 'occupancy:view', 'front-desk:operate'],
  MANAGER: [
    'dashboard:view',
    'reception:view',
    'housekeeping:view',
    'room-service:view',
    'concierge:view',
    'cash:view',
    'rooms:manage',
    'occupancy:view',
    'front-desk:operate',
  ],
  STAFF: ['dashboard:view', 'housekeeping:view', 'room-service:view', 'concierge:view'],
};
export interface Session extends AuthSession {
  role: UserRole;
  permissions: readonly Permission[];
}
export type Credentials = LoginDTO;
export function hasPermission(session: Session | null, permission: Permission) {
  return (
    !!session &&
    session.expiresAt.getTime() > Date.now() &&
    session.permissions.includes(permission)
  );
}
