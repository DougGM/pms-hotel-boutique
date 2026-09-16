import { routePaths } from '@/app/routes';
import { hasPermission, type Permission, type Session } from '@/modules/auth/models/session';

/**
 * Limpieza, Room Service y Conserjería no están acá: sus experiencias viven
 * en pms-hotel-mobile, no en esta web (ver docs/DECISIONES.md, D-008). Sus
 * rutas (routePaths.pms.housekeeping/roomService/concierge) y sus permisos
 * (housekeeping:view/room-service:view/concierge:view) siguen intactos en
 * routes.ts y session.ts — si algún día se decide que necesitan respaldo
 * web, reactivarlas es agregar de nuevo la entrada acá, nada más.
 */
export const privateNavigation: { label: string; path: string; permission: Permission }[] = [
  { label: 'Panel operativo', path: routePaths.pms.dashboard, permission: 'dashboard:view' },
  { label: 'Recepción', path: routePaths.pms.reception, permission: 'reception:view' },
  { label: 'Caja', path: routePaths.pms.cash, permission: 'cash:view' },
  { label: 'Usuarios', path: routePaths.pms.users, permission: 'users:view' },
  { label: 'Habitaciones', path: routePaths.pms.rooms, permission: 'rooms:manage' },
  { label: 'Tipos de habitación', path: routePaths.pms.roomTypes, permission: 'rooms:manage' },
  { label: 'Ocupación', path: routePaths.pms.occupancy, permission: 'occupancy:view' },
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
