import {
  toDomain as toBooking,
  type Booking,
  type BookingDto,
  type CreateBookingDto,
} from '@/shared/types/entities/booking';
import { BOOKING_STATUS_TRANSITIONS, isRoomAssignable } from '@/shared/constants/statuses';
import { toDomainCalendarDate, type ID } from '@/shared/types/common';
import { calculateNights } from '@/shared/utils/date';
import { bookingsDB, ratesDB, roomsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';

function assertBookingExists(id: ID): BookingDto {
  const booking = bookingsDB.find((item) => item.id === id);
  if (!booking) throw new Error(`No existe la reserva ${id}.`);
  return booking;
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
    throw new Error(`Transición inválida de reserva: ${currentStatus} -> ${nextStatus}.`);
  }

  booking.status = toDtoStatus(nextStatus);
  booking.updated_at = new Date().toISOString();
  return toBooking(booking);
}

export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las reservas.');
    return bookingsDB.map(toBooking);
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
    return transitionBooking(assertBookingExists(bookingId), 'checkedIn');
  },
  async checkOut(bookingId: ID): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible hacer check-out.');
    return transitionBooking(assertBookingExists(bookingId), 'checkedOut');
  },
  async assignRoom(bookingId: ID, roomId: ID): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible asignar la habitación.');

    const booking = assertBookingExists(bookingId);
    const room = roomsDB.find((item) => item.id === roomId);
    if (!room) throw new Error(`No existe la habitación ${roomId}.`);

    const status = room.status === 'out_of_service' ? 'outOfService' : room.status;
    if (!isRoomAssignable({ status, housekeepingStatus: room.housekeeping_status })) {
      throw new Error(`La habitación ${roomId} no está disponible para asignación.`);
    }

    booking.room_id = roomId;
    booking.updated_at = new Date().toISOString();
    return toBooking(booking);
  },
};
export default bookingService;
