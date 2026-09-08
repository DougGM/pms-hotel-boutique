import { toDomain as toBooking, type Booking, type CreateBookingDto } from '@/shared/types/entities/booking';
import type { ID } from '@/shared/types/common';
import { mockBookings } from './mockData';
import { mockUtils, simulateLatency } from './mockUtils';
export const bookingService = {
  async getBookings(): Promise<Booking[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las reservas.');
    return mockBookings.map(toBooking);
  },
  async getBookingById(id: ID): Promise<Booking | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la reserva.');
    const booking = mockBookings.find((item) => item.id === id);
    return booking ? toBooking(booking) : undefined;
  },
  async createBooking(data: CreateBookingDto): Promise<Booking> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear la reserva.');
    const now = new Date().toISOString();
    const booking = {
      ...data,
      id: `booking-${mockBookings.length + 1}`,
      confirmation_code: `PMS-${String(mockBookings.length + 1).padStart(4, '0')}`,
      status: 'pending' as const,
      total_amount_cents: 0,
      currency: 'GTQ' as const,
      created_at: now,
      updated_at: now,
    };
    mockBookings.push(booking);
    return toBooking(booking);
  },
};
export default bookingService;
