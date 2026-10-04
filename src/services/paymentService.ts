import {
  toDomain as toPayment,
  type AddPaymentDto,
  type Payment,
} from '@/shared/types/entities/payment';
import type { ID } from '@/shared/types/common';
import { paymentsDB } from '@/data/db';
import { guestAccountService } from './guestAccountService';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const paymentService = {
  async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> {
    if (UUID_PATTERN.test(bookingId)) return guestAccountService.getPaymentsByBookingId(bookingId);

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
