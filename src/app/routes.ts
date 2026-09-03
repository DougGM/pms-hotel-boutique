/**
 * Contract of routes defined in the frontend architecture workshop.
 * Vite does not auto-discover files, so this list is the source of truth until
 * the client router is introduced.
 */
export const routes = {
  public: [
    '/', '/rooms', '/rooms/:roomId', '/availability', '/promotions', '/amenities',
    '/policies/cancellation', '/reservations/new', '/reservations/payment',
    '/reservations/confirmation', '/auth/login', '/auth/register',
    '/auth/forgot-password', '/auth/reset-password',
  ],
  guest: [
    '/my-account', '/my-account/profile', '/my-account/reservations',
    '/my-account/reservations/:reservationId', '/my-account/link-reservation',
    '/my-account/stay', '/my-account/amenities', '/my-account/requests',
    '/my-account/requests/new', '/my-account/room-service',
    '/my-account/room-service/cart', '/my-account/room-service/orders',
    '/my-account/room-service/orders/:orderId', '/my-account/notifications',
  ],
  pms: [
    '/pms/dashboard', '/pms/reception', '/pms/reception/calendar',
    '/pms/reception/availability', '/pms/reception/reservations',
    '/pms/reception/reservations/new', '/pms/reception/reservations/:reservationId',
    '/pms/reception/reservations/:reservationId/edit', '/pms/reception/guests',
    '/pms/reception/guests/:guestId', '/pms/reception/check-in/:reservationId',
    '/pms/reception/stays/:stayId', '/pms/reception/stays/:stayId/account',
    '/pms/reception/stays/:stayId/check-out', '/pms/housekeeping',
    '/pms/housekeeping/rooms', '/pms/housekeeping/requests',
    '/pms/housekeeping/tasks', '/pms/housekeeping/history', '/pms/room-service',
    '/pms/room-service/orders', '/pms/room-service/orders/:orderId',
    '/pms/room-service/products', '/pms/concierge', '/pms/concierge/requests',
    '/pms/concierge/requests/:requestId', '/pms/concierge/history', '/pms/users',
    '/pms/roles', '/pms/rooms', '/pms/rates', '/pms/promotions', '/pms/amenities',
    '/pms/inventory', '/pms/inventory/movements', '/pms/cash',
    '/pms/cash/movements', '/pms/cash/opening', '/pms/cash/closing',
    '/pms/reports/occupancy', '/pms/reports/revenue', '/pms/reports/reservations',
    '/pms/reports/cancellations', '/pms/reports/channels', '/pms/reports/services',
    '/pms/reports/seasons', '/pms/audit',
  ],
} as const;
