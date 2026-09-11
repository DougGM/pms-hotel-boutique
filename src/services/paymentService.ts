import {
  toDomain as toPayment,
  type AddPaymentDto,
  type Payment,
} from '@/shared/types/entities/payment';
import type { ID } from '@/shared/types/common';
import { paymentsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';
export const paymentService = {
  async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return paymentsDB.filter((item) => item.booking_id === bookingId).map(toPayment);
  },
  async addCharge(data: AddPaymentDto): Promise<Payment> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible agregar el cargo.');
    const dto = {
      ...data,
      id: `payment-${paymentsDB.length + 1}`,
      method: 'cash' as const,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    };
    paymentsDB.push(dto);
    return toPayment(dto);
  },
};
export default paymentService;
