import {
  toDomain as toPayment,
  type AddPaymentDto,
  type Payment,
} from '@/shared/types/entities/payment';
import type { ID } from '@/shared/types/common';
import { paymentsDB } from '@/data/db';
import { guestAccountService } from './guestAccountService';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
export const paymentService = {
  async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return requireCollection(paymentsDB, 'paymentsDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toPayment);
  },
  async addCharge(data: AddPaymentDto): Promise<Payment> {
    return guestAccountService.createPayment(data);
  },
};
export default paymentService;
