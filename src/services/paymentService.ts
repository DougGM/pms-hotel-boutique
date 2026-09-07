import { paymentMapper, type AddChargeDTO, type Payment } from '@/shared/types/entities';
import type { ID } from '@/shared/types/common';
import { mockPayments } from './mockData';
import { mockUtils, simulateLatency } from './mockUtils';
export const paymentService = { async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.'); return mockPayments.filter((item) => item.bookingId === bookingId).map(paymentMapper.toDomain); }, async addCharge(data: AddChargeDTO): Promise<Payment> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible agregar el cargo.'); const dto = { ...data, id: `payment-${mockPayments.length + 1}`, method: 'cash' as const, status: 'pending' as const, createdAt: new Date().toISOString() }; mockPayments.push(dto); return paymentMapper.toDomain(dto); } };
export default paymentService;
