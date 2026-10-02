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
import { HttpError, httpClient } from './http-client';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { hydrateCollection, persistCollection } from './mockPersistence';

const guestAccountsStorageKey = 'PMS_GUEST_ACCOUNTS_DB';
const chargesStorageKey = 'PMS_CHARGES_DB';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GuestFolioResponse = {
  accountId: string;
  bookingId: string;
  guestId: string;
  status: 'open' | 'closed';
  balanceCents: number;
  currency: string;
  openedAt: string;
  closedAt?: string | null;
  activeChargesCents?: number | null;
  voidedChargesCents?: number | null;
  completedPaymentsCents?: number | null;
  charges: ChargeResponse[];
};

type ChargeResponse = {
  id: string;
  bookingId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  currency: string;
  category?: ChargeDto['category'] | null;
  status: ChargeDto['status'];
  chargedAt: string;
  createdByUserId?: string | null;
  voidReason?: string | null;
  createdAt: string;
};

type PaymentResponse = {
  id: string;
  bookingId: string;
  amountCents: number;
  currency: string;
  method: PaymentDto['method'];
  status: PaymentDto['status'];
  transactionReference?: string | null;
  paidAt?: string | null;
  processedByUserId?: string | null;
  createdAt: string;
};

type DepositResponse = {
  id: string;
  bookingId: string;
  guestId: string;
  amountCents: number;
  currency: string;
  method: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer';
  status: 'held' | 'refunded' | 'applied';
  collectedAt: string;
  refundedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

function getGuestAccountsDB(): GuestAccountDto[] {
  return hydrateCollection(guestAccountsStorageKey, guestAccountsDB);
}

function persistGuestAccountsDB(): void {
  persistCollection(guestAccountsStorageKey, guestAccountsDB);
}

function getChargesDB(): ChargeDto[] {
  return hydrateCollection(chargesStorageKey, chargesDB);
}

function persistChargesDB(): void {
  persistCollection(chargesStorageKey, chargesDB);
}

function createChargeId(): ID {
  return `CHG-${String(getChargesDB().length + 1).padStart(3, '0')}`;
}

function createPaymentId(): ID {
  return `PAY-${String(paymentsDB.length + 1).padStart(3, '0')}`;
}

function isUuid(value: ID): boolean {
  return UUID_PATTERN.test(value);
}

function normalizeCurrency(value: string): 'GTQ' {
  if (value !== 'GTQ') {
    throw new Error(`El folio solo admite moneda GTQ; backend devolvio ${value}.`);
  }
  return 'GTQ';
}

function toGuestAccountDto(response: GuestFolioResponse): GuestAccountDto {
  return {
    id: response.accountId,
    booking_id: response.bookingId,
    guest_id: response.guestId,
    status: response.status,
    balance_cents: response.balanceCents,
    currency: normalizeCurrency(response.currency),
    opened_at: response.openedAt,
    closed_at: response.closedAt ?? undefined,
    created_at: response.openedAt,
    updated_at: response.closedAt ?? response.openedAt,
  };
}

function toChargeDto(response: ChargeResponse): ChargeDto {
  return {
    id: response.id,
    booking_id: response.bookingId,
    product_id: response.productId ?? undefined,
    description: response.description,
    quantity: response.quantity,
    unit_price_cents: response.unitPriceCents,
    amount_cents: response.amountCents,
    currency: normalizeCurrency(response.currency),
    category: response.category ?? undefined,
    status: response.status,
    charged_at: response.chargedAt,
    created_by_user_id: response.createdByUserId ?? undefined,
    void_reason: response.voidReason ?? undefined,
    created_at: response.createdAt,
  };
}

function toPaymentDto(response: PaymentResponse): PaymentDto {
  return {
    id: response.id,
    booking_id: response.bookingId,
    amount_cents: response.amountCents,
    currency: normalizeCurrency(response.currency),
    method: response.method,
    status: response.status,
    transaction_reference: response.transactionReference ?? undefined,
    paid_at: response.paidAt ?? undefined,
    processed_by_user_id: response.processedByUserId ?? undefined,
    created_at: response.createdAt,
  };
}

function toDepositDto(
  response: DepositResponse,
): import('@/shared/types/entities/deposit').DepositDto {
  return {
    id: response.id,
    booking_id: response.bookingId,
    guest_id: response.guestId,
    amount_cents: response.amountCents,
    currency: normalizeCurrency(response.currency),
    method: response.method,
    status: response.status,
    collected_at: response.collectedAt,
    refunded_at: response.refundedAt ?? undefined,
    notes: response.notes ?? undefined,
    created_at: response.createdAt,
    updated_at: response.updatedAt,
  };
}

function paymentMethodToApi(method: AddPaymentDto['method'] = 'cash'): PaymentDto['method'] {
  return method;
}

function depositMethodToApi(method: Deposit['method']): DepositResponse['method'] {
  return method === 'creditCard'
    ? 'credit_card'
    : method === 'debitCard'
      ? 'debit_card'
      : method === 'bankTransfer'
        ? 'bank_transfer'
        : method;
}

function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return error instanceof Error ? error.message : fallback;
  const data = error.data;
  if (data && typeof data === 'object') {
    const value = data as { message?: unknown; error?: unknown; detail?: unknown };
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.error === 'string' && value.error.trim()) return value.error;
    if (typeof value.detail === 'string' && value.detail.trim()) return value.detail;
  }
  if (error.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
  if (error.status === 403) return 'No tienes permisos para operar el folio.';
  if (error.status === 404) return 'No se encontro el folio o recurso financiero solicitado.';
  if (error.status === 409)
    return 'La operacion financiera entro en conflicto con el estado actual.';
  return fallback;
}

function isStayCharge(charge: ChargeDto): boolean {
  return charge.category === 'stay';
}

export function calculateAccountBalanceCents(bookingId: ID): number {
  const chargesTotal = getChargesDB()
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
  persistGuestAccountsDB();
}

function ensureStayCharge(booking: BookingDto, now = new Date().toISOString()): ChargeDto | null {
  if (booking.total_amount_cents <= 0) return null;

  const existingStayTotal = getChargesDB()
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
    category: 'stay',
    status: 'posted',
    charged_at: now,
    created_at: now,
  };
  getChargesDB().push(charge);
  persistChargesDB();
  return charge;
}

export function openOrSyncAccountForBooking(booking: BookingDto): GuestAccountDto {
  const now = new Date().toISOString();
  let account = getGuestAccountsDB().find((item) => item.booking_id === booking.id);

  if (!account) {
    account = {
      id: `GACC-${String(getGuestAccountsDB().length + 1).padStart(3, '0')}`,
      booking_id: booking.id,
      guest_id: booking.guest_id,
      status: 'open',
      balance_cents: 0,
      currency: booking.currency,
      opened_at: now,
      created_at: now,
      updated_at: now,
    };
    getGuestAccountsDB().push(account);
    persistGuestAccountsDB();
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
  const account = getGuestAccountsDB().find((item) => item.booking_id === booking.id);
  if (!account) throw new Error(`No existe una cuenta para la reserva ${booking.id}.`);
  if (account.status !== 'open') {
    throw new Error(`La cuenta de la reserva ${booking.id} ya esta cerrada.`);
  }

  ensureStayCharge(booking, now);
  syncAccountBalance(account, now);
  if (account.balance_cents !== 0) {
    throw new Error(
      `No se puede hacer check-out: el saldo debe quedar exactamente en 0 centavos; saldo actual ${account.balance_cents} centavos.`,
    );
  }

  account.status = 'closed';
  account.closed_at = now;
  account.updated_at = now;
  persistGuestAccountsDB();
  return account;
}

export const guestAccountService = {
  calculateBalanceCents: calculateAccountBalanceCents,
  async getAccounts(): Promise<GuestAccount[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar las cuentas de huesped.');
    return requireCollection(getGuestAccountsDB(), 'guestAccountsDB').map(toGuestAccount);
  },
  async getAccountByBookingId(bookingId: ID): Promise<GuestAccount | undefined> {
    if (isUuid(bookingId)) {
      try {
        const response = await httpClient.get<GuestFolioResponse>(`/bookings/${bookingId}/folio`);
        return toGuestAccount(toGuestAccountDto(response));
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) return undefined;
        throw new Error(getHttpErrorMessage(error, 'No fue posible cargar la cuenta del huesped.'));
      }
    }

    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la cuenta del huesped.');
    const account = getGuestAccountsDB().find((item) => item.booking_id === bookingId);
    return account ? toGuestAccount(account) : undefined;
  },
  async getCharges(): Promise<Charge[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los cargos.');
    return requireCollection(getChargesDB(), 'chargesDB').map(toCharge);
  },
  async getChargesByBookingId(bookingId: ID): Promise<Charge[]> {
    if (isUuid(bookingId)) {
      try {
        const response = await httpClient.get<ChargeResponse[]>(`/bookings/${bookingId}/charges`);
        return response.map((item) => toCharge(toChargeDto(item)));
      } catch (error) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible cargar los cargos.'));
      }
    }

    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los cargos.');
    return requireCollection(getChargesDB(), 'chargesDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toCharge);
  },
  async createCharge(data: CreateChargeDto): Promise<Charge> {
    if (isUuid(data.booking_id)) {
      if (!data.description.trim()) throw new Error('El cargo requiere descripcion.');
      if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
        throw new Error('La cantidad debe ser un entero mayor a 0.');
      }
      if (!Number.isInteger(data.unit_price_cents) || data.unit_price_cents < 0) {
        throw new Error('El precio unitario debe ser un entero mayor o igual a 0.');
      }

      try {
        const response = await httpClient.post<ChargeResponse>(
          `/bookings/${data.booking_id}/charges`,
          {
            description: data.description.trim(),
            quantity: data.quantity,
            unitPriceCents: data.unit_price_cents,
            category: data.category ?? 'consumption',
            productId: data.product_id,
          },
        );
        return toCharge(toChargeDto(response));
      } catch (error) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible crear el cargo.'));
      }
    }

    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible crear el cargo.');

    const account = getGuestAccountsDB().find((item) => item.booking_id === data.booking_id);
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
      category: data.category ?? 'consumption',
      status: 'posted',
      charged_at: data.charged_at ?? now,
      created_at: now,
    };

    getChargesDB().push(charge);
    persistChargesDB();
    syncAccountBalance(account, now);
    return toCharge(charge);
  },
  async voidCharge(chargeId: ID, reason: string, bookingId?: ID): Promise<Charge> {
    if (bookingId && isUuid(bookingId) && isUuid(chargeId)) {
      if (!reason.trim()) throw new Error('Se requiere un motivo para anular el cargo.');
      try {
        const response = await httpClient.post<ChargeResponse>(
          `/bookings/${bookingId}/charges/${chargeId}/void`,
          { reason: reason.trim() },
        );
        return toCharge(toChargeDto(response));
      } catch (error) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible anular el cargo.'));
      }
    }

    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible anular el cargo.');

    const charge = getChargesDB().find((item) => item.id === chargeId);
    if (!charge) throw new Error(`No existe el cargo ${chargeId}.`);
    if (charge.status === 'voided') throw new Error(`El cargo ${chargeId} ya esta anulado.`);
    if (!reason.trim()) throw new Error('Se requiere un motivo para anular el cargo.');

    const account = getGuestAccountsDB().find((item) => item.booking_id === charge.booking_id);
    if (!account) throw new Error(`No existe una cuenta para la reserva ${charge.booking_id}.`);
    if (account.status !== 'open') {
      throw new Error('No se puede anular un cargo de una cuenta cerrada.');
    }

    charge.status = 'voided';
    charge.void_reason = reason.trim();
    persistChargesDB();
    syncAccountBalance(account);
    return toCharge(charge);
  },
  async getPayments(): Promise<Payment[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return requireCollection(paymentsDB, 'paymentsDB').map(toPayment);
  },
  async getPaymentsByBookingId(bookingId: ID): Promise<Payment[]> {
    if (isUuid(bookingId)) {
      try {
        const response = await httpClient.get<PaymentResponse[]>(`/bookings/${bookingId}/payments`);
        return response.map((item) => toPayment(toPaymentDto(item)));
      } catch (error) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible cargar los pagos.'));
      }
    }

    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los pagos.');
    return requireCollection(paymentsDB, 'paymentsDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toPayment);
  },
  async createPayment(data: AddPaymentDto): Promise<Payment> {
    if (isUuid(data.booking_id)) {
      if (!Number.isInteger(data.amount_cents) || data.amount_cents <= 0) {
        throw new Error('El pago debe ser un monto entero mayor a 0.');
      }

      try {
        const response = await httpClient.post<PaymentResponse>(
          `/bookings/${data.booking_id}/payments`,
          {
            amountCents: data.amount_cents,
            method: paymentMethodToApi(data.method),
            transactionReference: data.transaction_reference,
          },
        );
        return toPayment(toPaymentDto(response));
      } catch (error) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible registrar el pago.'));
      }
    }

    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible registrar el pago.');

    const account = getGuestAccountsDB().find((item) => item.booking_id === data.booking_id);
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
    if (isUuid(bookingId)) {
      try {
        const response = await httpClient.get<DepositResponse[]>(`/bookings/${bookingId}/deposits`);
        return response.map((item) => toDeposit(toDepositDto(item)));
      } catch (error) {
        throw new Error(getHttpErrorMessage(error, 'No fue posible cargar los depositos.'));
      }
    }

    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar los depositos.');
    return requireCollection(depositsDB, 'depositsDB')
      .filter((item) => item.booking_id === bookingId)
      .map(toDeposit);
  },
  async createDeposit(data: {
    bookingId: ID;
    amountCents: number;
    method: Deposit['method'];
    notes?: string;
  }): Promise<Deposit> {
    if (!Number.isInteger(data.amountCents) || data.amountCents <= 0) {
      throw new Error('El deposito debe ser un monto entero mayor a 0.');
    }
    if (!isUuid(data.bookingId)) {
      throw new Error('Los depositos nuevos requieren una reserva integrada con backend.');
    }

    try {
      const response = await httpClient.post<DepositResponse>(
        `/bookings/${data.bookingId}/deposits`,
        {
          amountCents: data.amountCents,
          method: depositMethodToApi(data.method),
          notes: data.notes?.trim() || undefined,
        },
      );
      return toDeposit(toDepositDto(response));
    } catch (error) {
      throw new Error(getHttpErrorMessage(error, 'No fue posible registrar el deposito.'));
    }
  },
  async refundDeposit(bookingId: ID, depositId: ID, reason?: string): Promise<Deposit> {
    if (!isUuid(bookingId) || !isUuid(depositId)) {
      throw new Error('El reembolso de deposito requiere recursos integrados con backend.');
    }

    try {
      const response = await httpClient.post<DepositResponse>(
        `/bookings/${bookingId}/deposits/${depositId}/refund`,
        reason?.trim() ? { reason: reason.trim() } : undefined,
      );
      return toDeposit(toDepositDto(response));
    } catch (error) {
      throw new Error(getHttpErrorMessage(error, 'No fue posible reembolsar el deposito.'));
    }
  },
  async applyDeposit(bookingId: ID, depositId: ID): Promise<Deposit> {
    if (!isUuid(bookingId) || !isUuid(depositId)) {
      throw new Error('La aplicacion de deposito requiere recursos integrados con backend.');
    }

    try {
      const response = await httpClient.post<DepositResponse>(
        `/bookings/${bookingId}/deposits/${depositId}/apply`,
      );
      return toDeposit(toDepositDto(response));
    } catch (error) {
      throw new Error(getHttpErrorMessage(error, 'No fue posible aplicar el deposito.'));
    }
  },
};
export default guestAccountService;
