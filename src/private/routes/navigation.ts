import { routePaths } from '@/app/routes';
import { hasPermission, type Permission, type Session } from '@/modules/auth/models/session';

export const privateNavigation: { label: string; path: string; permission: Permission }[] = [
  { label: 'Panel operativo', path: routePaths.pms.dashboard, permission: 'dashboard:view' },
  { label: 'Recepción', path: routePaths.pms.reception, permission: 'reception:view' },
  { label: 'Limpieza', path: routePaths.pms.housekeeping, permission: 'housekeeping:view' },
  { label: 'Room Service', path: routePaths.pms.roomService, permission: 'room-service:view' },
  { label: 'Conserjería', path: routePaths.pms.concierge, permission: 'concierge:view' },
  { label: 'Caja', path: routePaths.pms.cash, permission: 'cash:view' },
  { label: 'Usuarios', path: routePaths.pms.users, permission: 'users:view' },
];

export function getNavigation(session: Session | null) {
  return privateNavigation.filter((item) => hasPermission(session, item.permission));
}

export function getLoginDestination(from: unknown) {
  if (typeof from === 'string' && !from.includes('\\')) {
    try {
      const base = 'https://hotel.invalid';
      const url = new URL(from, base);
      if (
        url.origin === base &&
        (url.pathname === routePaths.pms.root || url.pathname.startsWith(`${routePaths.pms.root}/`))
      ) {
        return url.pathname + url.search + url.hash;
      }
    } catch {
      /* An invalid destination falls back to the dashboard. */
    }
  }
  return routePaths.pms.dashboard;
}
