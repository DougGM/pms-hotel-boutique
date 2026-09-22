import {
  toDomain as toGuestAccount,
  type GuestAccount,
  type GuestAccountDto,
} from '@/shared/types/entities/guest-account';
import {
  toDomain as toCharge,
  type Charge,
  type ChargeDto,
  type CreateChargeDto,
} from '@/shared/types/entities/charge';
import {
  toDomain as toPayment,
  type AddPaymentDto,
  type Payment,
  type PaymentDto,
} from '@/shared/types/entities/payment';
import { toDomain as toDeposit, type Deposit } from '@/shared/types/entities/deposit';
import type { BookingDto } from '@/shared/types/entities/booking';
import type { ID } from '@/shared/types/common';
import { chargesDB, depositsDB, guestAccountsDB, paymentsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

function createChargeId(): ID {
  return `CHG-${String(chargesDB.length + 1).padStart(3, '0')}`;
}

function createPaymentId(): ID {
  return `PAY-${String(paymentsDB.length + 1).padStart(3, '0')}`;
}

function isStayCharge(charge: ChargeDto): boolean {
  return (
    charge.description.startsWith('Estancia base') || charge.description.startsWith('Hospedaje')
  );
}

export function calculateAccountBalanceCents(bookingId: ID): number {
  const chargesTotal = chargesDB
    .filter((charge) => charge.booking_id === bookingId && charge.status === 'posted')
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  const paymentsTotal = paymentsDB
    .filter((payment) => payment.booking_id === bookingId && payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount_cents, 0);
  const depositsTotal = depositsDB
    .filter((deposit) => deposit.booking_id === bookingId && deposit.status !== 'refunded')
    .reduce((sum, deposit) => sum + deposit.amount_cents, 0);

  return chargesTotal - paymentsTotal - depositsTotal;
}

function syncAccountBalance(account: GuestAccountDto, now = new Date().toISOString()) {
  account.balance_cents = calculateAccountBalanceCents(account.booking_id);
  account.updated_at = now;
}

function ensureStayCharge(booking: BookingDto, now = new Date().toISOString()): ChargeDto | null {
  if (booking.total_amount_cents <= 0) return null;

  const existingStayTotal = chargesDB
    .filter(
      (charge) =>
        charge.booking_id === booking.id && charge.status !== 'voided' && isStayCharge(charge),
    )
    .reduce((sum, charge) => sum + charge.amount_cents, 0);
  if (existingStayTotal >= booking.total_amount_cents) return null;

  const charge: ChargeDto = {
    id: createChargeId(),
    booking_id: booking.id,
    description: `Estancia base (${booking.check_in} a ${booking.check_out})`,
    quantity: 1,
    unit_price_cents: booking.total_amount_cents,
    amount_cents: booking.total_amount_cents,
    currency: booking.currency,
    status: 'posted',
    charged_at: now,
    created_at: now,
  };
  chargesDB.push(charge);
  return charge;
}

export function openOrSyncAccountForBooking(booking: BookingDto): GuestAccountDto {
  const now = new Date().toISOString();
  let account = guestAccountsDB.find((item) => item.booking_id === booking.id);

  if (!account) {
    account = {
      id: `GACC-${String(guestAccountsDB.length + 1).padStart(3, '0')}`,
      booking_id: booking.id,
      guest_id: booking.guest_id,
      status: 'open',
      balance_cents: 0,
      currency: booking.currency,
      opened_at: now,
      created_at: now,
      updated_at: now,
    };
    guestAccountsDB.push(account);
  }

  if (account.status !== 'open') {
    throw new Error(`La cuenta de la reserva ${booking.id} no esta abierta.`);
  }

  ensureStayCharge(booking, now);
  syncAccountBalance(account, now);
  return account;
}

export function closeAccountForCheckout(booking: BookingDto): GuestAccountDto {
  const now = new Date().toISOString();
  const account = guestAccountsDB.find((item) => item.booking_id === booking.id);
  if (!account) throw new Error(`No existe una cuenta para la reserva ${booking.id}.`);
  if (account.status !== 'open') {
    throw new Error(`La cuenta de la reserva ${booking.id} ya esta cerrada.`);
  }

  ensureStayCharge(booking, now);
  syncAccountBalance(account, now);
  if (account.balance_cents > 0) {
    throw new Error(
      `No se puede hacer check-out: quedan ${account.balance_cents} centavos pendientes.`,
    );
  }

  account.status = 'closed';
  account.closed_at = now;
  account.updated_at = now;
  return account;
}

export const guestAccountService = {
  calculateBalanceCents: calculateAccountBalanceCents,
  async getAccounts(): Promise<GuestAccount[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las cuentas de huesped.');
    return requireCollection(guestAccountsDB, 'guestAccountsDB').map(toGuestAccount);
  },
  async getAccountByBookingId(bookingId: ID): Promise<GuestAccount | undefined> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la cuenta del huesped.');
    const account = guestAccountsDB.find((item) => item.booking_id === bookingId);
    return account ? toGuestAccount(account) : undefined;
  },
  async getCharges(): Promise<Charge[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los cargos.');
    return requireCollection(chargesDB, 'chargesDB').map(toCharge);
  },
  async getChargesByBookingId(bookingId: ID): Promise<Charge[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los cargos.');
    return requireCollection(chargesDB, 'chargesDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toCharge);
  },
  async createCharge(data: CreateChargeDto): Promise<Charge> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el cargo.');

    const account = guestAccountsDB.find((item) => item.booking_id === data.booking_id);
    if (!account) throw new Error(`No existe una cuenta para la reserva ${data.booking_id}.`);
    if (account.status !== 'open') {
      throw new Error(`La cuenta de la reserva ${data.booking_id} no esta abierta.`);
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
    syncAccountBalance(account, now);
    return toCharge(charge);
  },
  async voidCharge(chargeId: ID, reason: string): Promise<Charge> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible anular el cargo.');

    const charge = chargesDB.find((item) => item.id === chargeId);
    if (!charge) throw new Error(`No existe el cargo ${chargeId}.`);
    if (charge.status === 'voided') throw new Error(`El cargo ${chargeId} ya esta anulado.`);
    if (!reason.trim()) throw new Error('Se requiere un motivo para anular el cargo.');

    const account = guestAccountsDB.find((item) => item.booking_id === charge.booking_id);
    if (!account) throw new Error(`No existe una cuenta para la reserva ${charge.booking_id}.`);
    if (account.status !== 'open') {
      throw new Error('No se puede anular un cargo de una cuenta cerrada.');
    }

    charge.status = 'voided';
    charge.void_reason = reason.trim();
    syncAccountBalance(account);
    return toCharge(charge);
  },
  async getPayments(): Promise<Payment[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return requireCollection(paymentsDB, 'paymentsDB').map(toPayment);
  },
  async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return requireCollection(paymentsDB, 'paymentsDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toPayment);
  },
  async createPayment(data: AddPaymentDto): Promise<Payment> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible registrar el pago.');

    const account = guestAccountsDB.find((item) => item.booking_id === data.booking_id);
    if (!account) throw new Error(`No existe una cuenta para la reserva ${data.booking_id}.`);
    if (account.status !== 'open') {
      throw new Error(`La cuenta de la reserva ${data.booking_id} no esta abierta.`);
    }
    if (!Number.isInteger(data.amount_cents) || data.amount_cents <= 0) {
      throw new Error('El pago debe ser un monto entero mayor a 0.');
    }

    const now = new Date().toISOString();
    const payment: PaymentDto = {
      id: createPaymentId(),
      booking_id: data.booking_id,
      amount_cents: data.amount_cents,
      currency: data.currency,
      method: data.method ?? 'cash',
      status: 'completed',
      transaction_reference: data.transaction_reference,
      paid_at: data.paid_at ?? now,
      processed_by_user_id: data.processed_by_user_id,
      created_at: now,
    };

    paymentsDB.push(payment);
    syncAccountBalance(account, now);
    return toPayment(payment);
  },
  async getDeposits(): Promise<Deposit[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los depositos.');
    return requireCollection(depositsDB, 'depositsDB').map(toDeposit);
  },
  async getDepositsByBookingId(bookingId: ID): Promise<Deposit[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los depositos.');
    return requireCollection(depositsDB, 'depositsDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toDeposit);
  },
};
export default guestAccountService;
