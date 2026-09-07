export const roleLabels = {
  admin: 'Administración',
  reception: 'Recepción',
  housekeeping: 'Limpieza',
  'room-service': 'Room Service',
  concierge: 'Conserjería',
  payment: 'Caja',
} as const;

export type StaffRole = keyof typeof roleLabels;
export type Permission =
  | 'dashboard:view'
  | 'reception:view'
  | 'housekeeping:view'
  | 'room-service:view'
  | 'concierge:view'
  | 'cash:view'
  | 'users:view';

export const rolePermissions: Record<StaffRole, readonly Permission[]> = {
  admin: [
    'dashboard:view',
    'reception:view',
    'housekeeping:view',
    'room-service:view',
    'concierge:view',
    'cash:view',
    'users:view',
  ],
  reception: ['dashboard:view', 'reception:view'],
  housekeeping: ['dashboard:view', 'housekeeping:view'],
  'room-service': ['dashboard:view', 'room-service:view'],
  concierge: ['dashboard:view', 'concierge:view'],
  payment: ['dashboard:view', 'cash:view'],
};

export interface Session {
  user: { id: string; name: string; email: string };
  role: StaffRole;
  permissions: readonly Permission[];
  expiresAt: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export function hasPermission(session: Session | null, permission: Permission) {
  return !!session && session.expiresAt > Date.now() && session.permissions.includes(permission);
}
