import {
  toDomain as toBooking,
  type Booking,
  type BookingDto,
  type CreateBookingDto,
  type UpdateBookingDto,
} from '@/shared/types/entities/booking';
import { BOOKING_STATUS_TRANSITIONS, isRoomAssignable } from '@/shared/constants/statuses';
import { toDomainCalendarDate, type ID } from '@/shared/types/common';
import { calculateNights } from '@/shared/utils/date';
import { validateBookingCapacity } from '@/shared/utils/bookingCapacity';
import { bookingsDB, ratesDB, roomsDB, roomTypesDB } from '@/data/db';
import { closeAccountForCheckout, openOrSyncAccountForBooking } from './guestAccountService';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection, refreshCollection } from './mockPersistence';
import { HttpError, httpClient } from './http-client';

const bookingsStorageKey = 'pms.bookings';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApiBooking = {
  id: string;
  confirmationCode: string;
  guestLinkCode?: string | null;
  guestId?: string;
  guest?: { id: string };
  roomId?: string | null;
  room?: { id: string } | null;
  roomTypeId?: string;
  roomType?: { id: string };
  rateId?: string | null;
  rate?: { id: string } | null;
  checkIn: string;
  checkOut: string;
  status: BookingDto['status'] | Booking['status'];
  adults: number;
  children: number;
  totalAmountCents: number;
  currency?: BookingDto['currency'];
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const nowIso = () => new Date().toISOString();
const isOfflineError = (error: unknown): boolean =>
  !(error instanceof HttpError) || error.status === 404;
const isHttpNotFound = (error: unknown): boolean =>
  error instanceof HttpError && error.status === 404;

function getBookingsCollection() {
  return hydrateCollection(bookingsStorageKey, bookingsDB);
}

function assertBookingExists(id: ID): BookingDto {
  const booking = getBookingsCollection().find((item) => item.id === id);
  if (!booking) throw new Error(`No existe la reserva ${id}.`);
  return booking;
}

function assertBookingCapacity(data: Pick<BookingDto, 'room_type_id' | 'adults' | 'children'>) {
  const roomType = roomTypesDB.find((item) => item.id === data.room_type_id);
  if (!roomType && isUuid(data.room_type_id)) return;
  if (!roomType) throw new Error(`No existe el tipo de habitacion ${data.room_type_id}.`);

  const message = validateBookingCapacity({
    adults: data.adults,
    children: data.children,
    capacity: roomType.capacity,
    roomTypeName: roomType.name,
  });
  if (message) throw new Error(message);
}

function toDomainStatus(status: BookingDto['status']): Booking['status'] {
  return status === 'checked_in'
    ? 'checkedIn'
    : status === 'checked_out'
      ? 'checkedOut'
      : status === 'no_show'
        ? 'noShow'
        : status;
}

function toDtoStatus(status: Booking['status']): BookingDto['status'] {
  return status === 'checkedIn'
    ? 'checked_in'
    : status === 'checkedOut'
      ? 'checked_out'
      : status === 'noShow'
        ? 'no_show'
        : status;
}

function normalizeApiStatus(status: ApiBooking['status']): BookingDto['status'] {
  return toDtoStatus(
    status === 'checked_in'
      ? 'checkedIn'
      : status === 'checked_out'
        ? 'checkedOut'
        : status === 'no_show'
          ? 'noShow'
          : status,
  );
}

function requireRelatedId(id: string | undefined, label: string): string {
  if (!id) throw new Error(`La respuesta del backend no incluye ${label}.`);
  return id;
}

function toBookingDto(api: ApiBooking): BookingDto {
  const timestamp = api.updatedAt ?? api.createdAt ?? nowIso();
  return {
    id: api.id,
    confirmation_code: api.confirmationCode,
    guest_link_code: api.guestLinkCode ?? api.confirmationCode,
    guest_id: requireRelatedId(api.guestId ?? api.guest?.id, 'guestId'),
    room_id: api.roomId ?? api.room?.id ?? undefined,
    room_type_id: requireRelatedId(api.roomTypeId ?? api.roomType?.id, 'roomTypeId'),
    rate_id: api.rateId ?? api.rate?.id ?? undefined,
    check_in: api.checkIn,
    check_out: api.checkOut,
    status: normalizeApiStatus(api.status),
    adults: api.adults,
    children: api.children,
    total_amount_cents: api.totalAmountCents,
    currency: api.currency ?? 'GTQ',
    notes: api.notes ?? undefined,
    created_at: api.createdAt ?? timestamp,
    updated_at: timestamp,
  };
}

function toBookingRequest(data: CreateBookingDto | UpdateBookingDto) {
  return {
    guestId: data.guest_id,
    roomTypeId: data.room_type_id,
    rateId: data.rate_id,
    checkIn: data.check_in,
    checkOut: data.check_out,
    adults: data.adults,
    children: data.children,
    notes: data.notes?.trim() || undefined,
  };
}

function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return error instanceof Error ? error.message : fallback;
  const data = error.data;
  if (data && typeof data === 'object') {
    const value = data as { message?: unknown; error?: unknown; detail?: unknown };
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.error === 'string' && value.error.trim()) return value.error;
    if (typeof value.detail === 'string' && value.detail.trim()) return value.detail;
  }
  if (error.status === 400) return `${fallback} Revisa los datos enviados.`;
  if (error.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
  if (error.status === 403) return 'No tienes permisos para operar reservas.';
  if (error.status === 404) return `${fallback} La reserva ya no existe.`;
  if (error.status === 409) return `${fallback} El backend reporto un conflicto.`;
  return fallback;
}

async function request<T>(call: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw new Error(getHttpErrorMessage(error, fallback));
  }
}

function isUuid(value: ID): boolean {
  return UUID_PATTERN.test(value);
}

function transitionBooking(booking: BookingDto, nextStatus: Booking['status']): Booking {
  const currentStatus = toDomainStatus(booking.status);
  if (!BOOKING_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(`Transicion invalida de reserva: ${currentStatus} -> ${nextStatus}.`);
  }

  booking.status = toDtoStatus(nextStatus);
  booking.updated_at = new Date().toISOString();
  persistCollection(bookingsStorageKey, getBookingsCollection());
  return toBooking(booking);
}

function createLocalBooking(data: CreateBookingDto): Booking {
  assertBookingCapacity(data);

  const collection = getBookingsCollection();
  const now = new Date().toISOString();
  const rate = data.rate_id ? ratesDB.find((item) => item.id === data.rate_id) : undefined;
  const sequence = collection.length + 1;
  const totalAmountCents = rate
    ? rate.price_cents *
      calculateNights(toDomainCalendarDate(data.check_in), toDomainCalendarDate(data.check_out))
    : 0;
  const booking = {
    ...data,
    id: `booking-${sequence}`,
    confirmation_code: `PMS-${String(sequence).padStart(4, '0')}`,
    guest_link_code: `LNK-${String(sequence).padStart(4, '0')}`,
    status: 'pending' as const,
    total_amount_cents: totalAmountCents,
    currency: 'GTQ' as const,
    created_at: now,
    updated_at: now,
  };
  collection.push(booking);
  persistCollection(bookingsStorageKey, collection);
  return toBooking(booking);
}

export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las reservas.');
    try {
      const bookings = await httpClient.get<ApiBooking[]>('/bookings');
      return bookings.map(toBookingDto).map(toBooking);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
    }
    return requireCollection(
      refreshCollection(bookingsStorageKey, getBookingsCollection()),
      'bookingsDB',
    ).map(toBooking);
  },
  async getBookingById(id: ID): Promise<Booking | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la reserva.');
    try {
      const booking = await httpClient.get<ApiBooking>(`/bookings/${id}`);
      return toBooking(toBookingDto(booking));
    } catch (error) {
      if (isHttpNotFound(error) && isUuid(id)) return undefined;
      if (!isOfflineError(error)) throw error;
    }
    const booking = getBookingsCollection().find((item) => item.id === id);
    return booking ? toBooking(booking) : undefined;
  },
  async createBooking(data: CreateBookingDto): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la reserva.');
    assertBookingCapacity(data);

    try {
      const booking = await httpClient.post<ApiBooking>('/bookings', toBookingRequest(data));
      return toBooking(toBookingDto(booking));
    } catch (error) {
      if (!isOfflineError(error)) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible crear la reserva.'));
      }
      return createLocalBooking(data);
    }
  },
  async checkIn(bookingId: ID): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible hacer check-in.');

    const booking = assertBookingExists(bookingId);
    const currentStatus = toDomainStatus(booking.status);
    if (!BOOKING_STATUS_TRANSITIONS[currentStatus].includes('checkedIn')) {
      throw new Error(`Transicion invalida de reserva: ${currentStatus} -> checkedIn.`);
    }

    openOrSyncAccountForBooking(booking);
    if (booking.room_id) {
      const room = roomsDB.find((item) => item.id === booking.room_id);
      if (room) {
        room.status = 'occupied';
        room.updated_at = new Date().toISOString();
      }
    }
    return transitionBooking(booking, 'checkedIn');
  },
  async checkOut(bookingId: ID): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible hacer check-out.');

    const booking = assertBookingExists(bookingId);
    closeAccountForCheckout(booking);
    const checkedOut = transitionBooking(booking, 'checkedOut');

    if (booking.room_id) {
      const room = roomsDB.find((item) => item.id === booking.room_id);
      if (room) {
        room.status = 'available';
        room.housekeeping_status = 'dirty';
        room.updated_at = new Date().toISOString();
      }
    }

    return checkedOut;
  },
  async updateBooking(id: ID, data: UpdateBookingDto): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible actualizar la reserva.');

    if (isUuid(id)) {
      const booking = await request(
        () => httpClient.put<ApiBooking>(`/bookings/${id}`, toBookingRequest(data)),
        'No fue posible actualizar la reserva.',
      );
      return toBooking(toBookingDto(booking));
    }

    const booking = assertBookingExists(id);
    const nextBooking = { ...booking, ...data };
    assertBookingCapacity(nextBooking);
    Object.assign(booking, data);

    if (data.rate_id !== undefined || data.check_in !== undefined || data.check_out !== undefined) {
      const rate = booking.rate_id
        ? ratesDB.find((item) => item.id === booking.rate_id)
        : undefined;
      booking.total_amount_cents = rate
        ? rate.price_cents *
          calculateNights(
            toDomainCalendarDate(booking.check_in),
            toDomainCalendarDate(booking.check_out),
          )
        : booking.total_amount_cents;
    }

    booking.updated_at = new Date().toISOString();
    persistCollection(bookingsStorageKey, getBookingsCollection());
    return toBooking(booking);
  },
  async confirmBooking(bookingId: ID): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible confirmar la reserva.');
    return transitionBooking(assertBookingExists(bookingId), 'confirmed');
  },
  async cancelBooking(bookingId: ID, reason: string): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cancelar la reserva.');

    if (!reason.trim()) throw new Error('Se requiere un motivo para cancelar la reserva.');

    const booking = assertBookingExists(bookingId);
    transitionBooking(booking, 'cancelled');
    booking.notes = booking.notes
      ? `${booking.notes}\nCancelada: ${reason.trim()}`
      : `Cancelada: ${reason.trim()}`;
    persistCollection(bookingsStorageKey, getBookingsCollection());
    return toBooking(booking);
  },
  async assignRoom(bookingId: ID, roomId: ID): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible asignar la habitacion.');

    const booking = assertBookingExists(bookingId);
    const room = roomsDB.find((item) => item.id === roomId);
    if (!room) throw new Error(`No existe la habitacion ${roomId}.`);

    const status = room.status === 'out_of_service' ? 'outOfService' : room.status;
    if (!isRoomAssignable({ status, housekeepingStatus: room.housekeeping_status })) {
      throw new Error(`La habitacion ${roomId} no esta disponible para asignacion.`);
    }

    booking.room_id = roomId;
    booking.updated_at = new Date().toISOString();
    persistCollection(bookingsStorageKey, getBookingsCollection());
    return toBooking(booking);
  },
};
export default bookingService;
