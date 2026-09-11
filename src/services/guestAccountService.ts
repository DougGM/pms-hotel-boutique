import {
  toDomain as toGuestAccount,
  type GuestAccount,
} from '@/shared/types/entities/guest-account';
import { toDomain as toCharge, type Charge } from '@/shared/types/entities/charge';
import { toDomain as toPayment, type Payment } from '@/shared/types/entities/payment';
import { toDomain as toDeposit, type Deposit } from '@/shared/types/entities/deposit';
import type { ID } from '@/shared/types/common';
import { chargesDB, depositsDB, guestAccountsDB, paymentsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';

export const guestAccountService = {
  async getAccounts(): Promise<GuestAccount[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las cuentas de huésped.');
    return guestAccountsDB.map(toGuestAccount);
  },
  async getAccountByBookingId(bookingId: ID): Promise<GuestAccount | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la cuenta del huésped.');
    const account = guestAccountsDB.find((item) => item.booking_id === bookingId);
    return account ? toGuestAccount(account) : undefined;
  },
  async getChargesByBookingId(bookingId: ID): Promise<Charge[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los cargos.');
    return chargesDB.filter((item) => item.booking_id === bookingId).map(toCharge);
  },
  async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return paymentsDB.filter((item) => item.booking_id === bookingId).map(toPayment);
  },
  async getDepositsByBookingId(bookingId: ID): Promise<Deposit[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los depósitos.');
    return depositsDB.filter((item) => item.booking_id === bookingId).map(toDeposit);
  },
};
export default guestAccountService;
