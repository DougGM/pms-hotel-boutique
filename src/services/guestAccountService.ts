import {
  toDomain as toGuestAccount,
  type GuestAccount,
} from '@/shared/types/entities/guest-account';
import {
  toDomain as toCharge,
  type Charge,
  type ChargeDto,
  type CreateChargeDto,
} from '@/shared/types/entities/charge';
import { toDomain as toPayment, type Payment } from '@/shared/types/entities/payment';
import { toDomain as toDeposit, type Deposit } from '@/shared/types/entities/deposit';
import type { ID } from '@/shared/types/common';
import { chargesDB, depositsDB, guestAccountsDB, paymentsDB } from '@/data/db';
import { mockUtils, simulateLatency } from './mockUtils';

function createChargeId(): ID {
  return `CHG-${String(chargesDB.length + 1).padStart(3, '0')}`;
}

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
  async createCharge(data: CreateChargeDto): Promise<Charge> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el cargo.');

    const account = guestAccountsDB.find((item) => item.booking_id === data.booking_id);
    if (!account) throw new Error(`No existe una cuenta para la reserva ${data.booking_id}.`);
    if (account.status !== 'open') {
      throw new Error(`La cuenta de la reserva ${data.booking_id} no está abierta.`);
    }

    const now = new Date().toISOString();
    const amountCents = data.quantity * data.unit_price_cents;
    const charge: ChargeDto = {
      ...data,
      id: createChargeId(),
      amount_cents: amountCents,
      status: 'posted',
      charged_at: data.charged_at ?? now,
      created_at: now,
    };

    chargesDB.push(charge);
    account.balance_cents += amountCents;
    account.updated_at = now;
    return toCharge(charge);
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
