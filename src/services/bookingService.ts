import {
  toDomain as toBooking,
  type Booking,
  type CreateBookingDto,
} from '@/shared/types/entities/booking';
import type { ID } from '@/shared/types/common';
import { bookingsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';
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
    const booking = {
      ...data,
      id: `booking-${bookingsDB.length + 1}`,
      confirmation_code: `PMS-${String(bookingsDB.length + 1).padStart(4, '0')}`,
      guest_link_code: `LNK-${String(bookingsDB.length + 1).padStart(4, '0')}`,
      status: 'pending' as const,
      total_amount_cents: 0,
      currency: 'GTQ' as const,
      created_at: now,
      updated_at: now,
    };
    bookingsDB.push(booking);
    return toBooking(booking);
  },
};
export default bookingService;
