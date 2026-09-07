import type { ChargeType, Currency, ID, ISODateString, PaymentMethod, PaymentStatus } from '../common';
export interface PaymentDTO { id: ID; bookingId: ID; amount: number; currency: Currency; method: PaymentMethod; status: PaymentStatus; type: ChargeType; description: string; transactionId?: string; createdAt: ISODateString; paidAt?: ISODateString }
export interface Payment extends Omit<PaymentDTO, 'createdAt' | 'paidAt'> { createdAt: Date; paidAt?: Date }
export const paymentMapper = { toDomain(dto: PaymentDTO): Payment { return { ...dto, createdAt: new Date(dto.createdAt), paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined } } };
export interface AddChargeDTO { bookingId: ID; amount: number; currency: Currency; type: ChargeType; description: string }
