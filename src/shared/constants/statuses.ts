// Contrato compartido de estados y transiciones válidas para web y móvil.
// Fuente de verdad: la web (ver docs/CONTRATO-DATOS.md, sección "Máquinas de
// estado"). Móvil debe usar exactamente estos literales camelCase — son los
// mismos que expone el Model de cada entidad; el DTO los traduce a
// snake_case en su mapper, igual que el resto del contrato.
//
// Ningún literal se renombra en silencio: si un valor de aquí cambia, se
// anuncia a ambos lados antes de tocar el código (ver "Cómo se cambia este
// contrato" en docs/CONTRATO-DATOS.md).

// --- room --------------------------------------------------------------
//
// Estos son los literales que la web usa HOY (RoomStatus en
// shared/types/entities/room/). Modelan disponibilidad/servicio de la
// habitación, no un flujo de limpieza. El plan de móvil (MOV-04) esperaba
// un flujo distinto — dirty → cleaning → clean → inspected, cualquiera →
// blocked — pensado para que el personal de limpieza reporte el avance de
// una tarea. Son dos máquinas de estado distintas que responden preguntas
// distintas ("¿se puede vender la habitación?" vs. "¿en qué paso de la
// limpieza está?"); no se unifican en este PR — ver la decisión pendiente
// de equipo en docs/CONTRATO-DATOS.md.
export const ROOM_STATUSES = [
  'available',
  'occupied',
  'cleaning',
  'maintenance',
  'outOfService',
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROOM_STATUS_TRANSITIONS: Record<RoomStatus, readonly RoomStatus[]> = {
  available: ['occupied', 'cleaning', 'maintenance', 'outOfService'],
  occupied: ['cleaning', 'maintenance', 'outOfService'],
  cleaning: ['available', 'maintenance', 'outOfService'],
  maintenance: ['available', 'outOfService'],
  outOfService: ['available', 'maintenance'],
};

// --- booking -------------------------------------------------------------
//
// Literales tal cual los usa hoy el dataset del Lote B (shared/mocks/lot-b.ts)
// y BookingStatus en shared/types/entities/booking/. Ninguna capa de código
// impone hoy estas transiciones (no había máquina de estado explícita antes
// de este archivo); se documentan como la interpretación de dominio más
// directa para que ambos equipos converjan en la misma.
export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'checkedIn',
  'checkedOut',
  'cancelled',
  'noShow',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'noShow'],
  confirmed: ['checkedIn', 'cancelled', 'noShow'],
  checkedIn: ['checkedOut'],
  checkedOut: [],
  cancelled: [],
  noShow: [],
};

// --- order -----------------------------------------------------------------
//
// Entidad nueva (FASE 2.4): no había literales previos en la web con los que
// chocar, así que se usan exactamente los que móvil necesita.
export const ORDER_STATUSES = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'onTheWay',
  'delivered',
  'rejected',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['onTheWay'],
  onTheWay: ['delivered'],
  delivered: [],
  rejected: [],
  cancelled: [],
};

// --- service_request ---------------------------------------------------
//
// Entidad nueva (FASE 2.4), mismo caso que `order`.
export const SERVICE_REQUEST_STATUSES = [
  'pending',
  'accepted',
  'inProgress',
  'completed',
  'rejected',
] as const;
export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_REQUEST_STATUS_TRANSITIONS: Record<
  ServiceRequestStatus,
  readonly ServiceRequestStatus[]
> = {
  pending: ['accepted', 'rejected'],
  accepted: ['inProgress'],
  inProgress: ['completed'],
  completed: [],
  rejected: [],
};
