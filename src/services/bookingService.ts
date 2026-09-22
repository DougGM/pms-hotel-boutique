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

function assertBookingExists(id: ID): BookingDto {
  const booking = bookingsDB.find((item) => item.id === id);
  if (!booking) throw new Error(`No existe la reserva ${id}.`);
  return booking;
}

function assertBookingCapacity(data: Pick<BookingDto, 'room_type_id' | 'adults' | 'children'>) {
  const roomType = roomTypesDB.find((item) => item.id === data.room_type_id);
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

function transitionBooking(booking: BookingDto, nextStatus: Booking['status']): Booking {
  const currentStatus = toDomainStatus(booking.status);
  if (!BOOKING_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(`Transicion invalida de reserva: ${currentStatus} -> ${nextStatus}.`);
  }

  booking.status = toDtoStatus(nextStatus);
  booking.updated_at = new Date().toISOString();
  return toBooking(booking);
}

export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las reservas.');
    return requireCollection(bookingsDB, 'bookingsDB').map(toBooking);
  },
  async getBookingById(id: ID): Promise<Booking | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la reserva.');
    const booking = bookingsDB.find((item) => item.id === id);
    return booking ? toBooking(booking) : undefined;
  },
  async createBooking(data: CreateBookingDto): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la reserva.');
    assertBookingCapacity(data);

    const now = new Date().toISOString();
    const rate = data.rate_id ? ratesDB.find((item) => item.id === data.rate_id) : undefined;
    const totalAmountCents = rate
      ? rate.price_cents *
        calculateNights(toDomainCalendarDate(data.check_in), toDomainCalendarDate(data.check_out))
      : 0;
    const booking = {
      ...data,
      id: `booking-${bookingsDB.length + 1}`,
      confirmation_code: `PMS-${String(bookingsDB.length + 1).padStart(4, '0')}`,
      guest_link_code: `LNK-${String(bookingsDB.length + 1).padStart(4, '0')}`,
      status: 'pending' as const,
      total_amount_cents: totalAmountCents,
      currency: 'GTQ' as const,
      created_at: now,
      updated_at: now,
    };
    bookingsDB.push(booking);
    return toBooking(booking);
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
    return toBooking(booking);
  },
};
export default bookingService;
