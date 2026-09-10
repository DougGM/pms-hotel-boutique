import {
  toDomain as toGuestAccount,
  type GuestAccount,
} from '@/shared/types/entities/guest-account';
import { toDomain as toCharge, type Charge } from '@/shared/types/entities/charge';
import { toDomain as toPayment, type Payment } from '@/shared/types/entities/payment';
import { toDomain as toDeposit, type Deposit } from '@/shared/types/entities/deposit';
import type { ID } from '@/shared/types/common';
import { lotCMockData } from '@/shared/mocks/lot-c';
import { mockUtils, simulateLatency } from './mockUtils';

export const guestAccountService = {
  async getAccounts(): Promise<GuestAccount[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las cuentas de huésped.');
    return lotCMockData.guestAccounts.map(toGuestAccount);
  },
  async getAccountByBookingId(bookingId: ID): Promise<GuestAccount | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la cuenta del huésped.');
    const account = lotCMockData.guestAccounts.find((item) => item.booking_id === bookingId);
    return account ? toGuestAccount(account) : undefined;
  },
  async getChargesByBookingId(bookingId: ID): Promise<Charge[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los cargos.');
    return lotCMockData.charges.filter((item) => item.booking_id === bookingId).map(toCharge);
  },
  async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return lotCMockData.payments.filter((item) => item.booking_id === bookingId).map(toPayment);
  },
  async getDepositsByBookingId(bookingId: ID): Promise<Deposit[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los depósitos.');
    return lotCMockData.deposits.filter((item) => item.booking_id === bookingId).map(toDeposit);
  },
};
export default guestAccountService;
