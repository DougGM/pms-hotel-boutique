import type { CashMovementDto } from '@/shared/types/entities/cash-movement';
import type { CashSessionDto } from '@/shared/types/entities/cash-session';
import type { ChargeDto } from '@/shared/types/entities/charge';
import type { DepositDto } from '@/shared/types/entities/deposit';
import type { GuestAccountDto } from '@/shared/types/entities/guest-account';
import type { PaymentDto } from '@/shared/types/entities/payment';

// Dataset del Lote C (WEB-11): cuentas de huésped, cargos, pagos, depósitos
// y caja. Construido sobre las reservas y huéspedes reales del Lote B
// (`shared/mocks/lot-b.ts`: BKG-*/GST-*), no sobre el mundo pequeño de
// `services/mockData.ts` — ver PROGRESO-MOCKS.md FASE 1.
//
// Los usuarios referenciados (USR-001 front_desk, USR-002 admin) se
// completan como parte del catálogo de personal del Lote D
// (`shared/mocks/lot-d.ts`, FASE 3) — ambos existen ahí con esos mismos
// IDs. Hasta que ese commit aterrice en la misma rama, estas referencias
// no resuelven todavía; quedan consistentes dentro del mismo PR.

export interface LotCMockData {
  guestAccounts: GuestAccountDto[];
  charges: ChargeDto[];
  payments: PaymentDto[];
  deposits: DepositDto[];
  cashSessions: CashSessionDto[];
  cashMovements: CashMovementDto[];
}

export const lotCMockData: LotCMockData = {
  // --- Cuentas del huésped -------------------------------------------
  //
  // Cuatro cuentas, una por caso pedido: GACC-001 saldo pendiente,
  // GACC-002 saldo cero, GACC-003 sobrepago, GACC-004 cerrada con
  // comprobante. `balance_cents` es un valor guardado — coincide con
  // cargos (no anulados) menos pagos completados de la misma reserva;
  // `scripts/test-lot-c-d.mjs` lo recalcula y lo verifica.
  guestAccounts: [
    {
      id: 'GACC-001',
      booking_id: 'BKG-003',
      guest_id: 'GST-003',
      status: 'open',
      balance_cents: 105500,
      currency: 'GTQ',
      opened_at: '2026-09-07T14:00:00.000Z',
      created_at: '2026-09-07T14:00:00.000Z',
      updated_at: '2026-09-08T18:00:00.000Z',
    },
    {
      id: 'GACC-002',
      booking_id: 'BKG-009',
      guest_id: 'GST-009',
      status: 'open',
      balance_cents: 0,
      currency: 'GTQ',
      opened_at: '2026-09-09T10:00:00.000Z',
      created_at: '2026-09-09T10:00:00.000Z',
      updated_at: '2026-09-09T10:00:00.000Z',
    },
    {
      id: 'GACC-003',
      booking_id: 'BKG-002',
      guest_id: 'GST-002',
      status: 'open',
      balance_cents: -25000,
      currency: 'GTQ',
      opened_at: '2026-09-09T11:00:00.000Z',
      created_at: '2026-09-09T11:00:00.000Z',
      updated_at: '2026-09-09T11:00:00.000Z',
    },
    {
      id: 'GACC-004',
      booking_id: 'BKG-004',
      guest_id: 'GST-004',
      status: 'closed',
      balance_cents: 0,
      currency: 'GTQ',
      opened_at: '2026-08-20T14:00:00.000Z',
      closed_at: '2026-08-23T11:00:00.000Z',
      created_at: '2026-08-20T14:00:00.000Z',
      updated_at: '2026-08-23T11:00:00.000Z',
    },
  ],

  // --- Cargos ----------------------------------------------------------
  //
  // GACC-001 incluye un cargo anulado (CHG-105) con motivo, que se
  // conserva en el dataset y se excluye del saldo (status !== 'voided').
  charges: [
    {
      id: 'CHG-101',
      booking_id: 'BKG-003',
      description: 'Hospedaje — noche 1 (Junior Suite, temporada alta)',
      quantity: 1,
      unit_price_cents: 150000,
      amount_cents: 150000,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-09-07T14:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-09-07T14:00:00.000Z',
    },
    {
      id: 'CHG-102',
      booking_id: 'BKG-003',
      description: 'Hospedaje — noche 2 (Junior Suite, temporada alta)',
      quantity: 1,
      unit_price_cents: 150000,
      amount_cents: 150000,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-09-08T14:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-09-08T14:00:00.000Z',
    },
    {
      id: 'CHG-103',
      booking_id: 'BKG-003',
      description: 'Consumo de minibar — agua mineral',
      quantity: 2,
      unit_price_cents: 1500,
      amount_cents: 3000,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-09-08T20:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-09-08T20:00:00.000Z',
    },
    {
      id: 'CHG-104',
      booking_id: 'BKG-003',
      description: 'Servicio de lavandería',
      quantity: 1,
      unit_price_cents: 2500,
      amount_cents: 2500,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-09-08T09:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-09-08T09:00:00.000Z',
    },
    {
      id: 'CHG-105',
      booking_id: 'BKG-003',
      description: 'Servicio a la habitación — registrado por error',
      quantity: 1,
      unit_price_cents: 1500,
      amount_cents: 1500,
      currency: 'GTQ',
      status: 'voided',
      void_reason: 'Cargo duplicado: el mismo consumo ya está en CHG-103.',
      charged_at: '2026-09-08T20:05:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-09-08T20:05:00.000Z',
    },
    {
      id: 'CHG-201',
      booking_id: 'BKG-009',
      description: 'Hospedaje total de la estadía (Familiar, 2 noches)',
      quantity: 1,
      unit_price_cents: 300000,
      amount_cents: 300000,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-09-09T10:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-09-09T10:00:00.000Z',
    },
    {
      id: 'CHG-301',
      booking_id: 'BKG-002',
      description: 'Hospedaje total de la estadía (Deluxe, 3 noches)',
      quantity: 1,
      unit_price_cents: 255000,
      amount_cents: 255000,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-09-09T11:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-09-09T11:00:00.000Z',
    },
    {
      id: 'CHG-401',
      booking_id: 'BKG-004',
      description: 'Hospedaje total de la estadía (Familiar, 3 noches)',
      quantity: 1,
      unit_price_cents: 450000,
      amount_cents: 450000,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-08-20T14:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-08-20T14:00:00.000Z',
    },
    {
      id: 'CHG-402',
      booking_id: 'BKG-004',
      description: 'Consumo de minibar — snacks',
      quantity: 1,
      unit_price_cents: 2000,
      amount_cents: 2000,
      currency: 'GTQ',
      status: 'posted',
      charged_at: '2026-08-22T21:00:00.000Z',
      created_by_user_id: 'USR-001',
      created_at: '2026-08-22T21:00:00.000Z',
    },
  ],

  // --- Pagos ------------------------------------------------------------
  payments: [
    {
      id: 'PAY-101',
      booking_id: 'BKG-003',
      amount_cents: 200000,
      currency: 'GTQ',
      method: 'cash',
      status: 'completed',
      transaction_reference: 'RCB-0001',
      paid_at: '2026-09-08T18:00:00.000Z',
      processed_by_user_id: 'USR-001',
      created_at: '2026-09-08T18:00:00.000Z',
    },
    {
      id: 'PAY-201',
      booking_id: 'BKG-009',
      amount_cents: 300000,
      currency: 'GTQ',
      method: 'credit_card',
      status: 'completed',
      transaction_reference: 'RCB-0002',
      paid_at: '2026-09-09T10:00:00.000Z',
      processed_by_user_id: 'USR-001',
      created_at: '2026-09-09T10:00:00.000Z',
    },
    {
      id: 'PAY-301',
      booking_id: 'BKG-002',
      amount_cents: 280000,
      currency: 'GTQ',
      method: 'cash',
      status: 'completed',
      transaction_reference: 'RCB-0003',
      paid_at: '2026-09-09T11:00:00.000Z',
      processed_by_user_id: 'USR-001',
      created_at: '2026-09-09T11:00:00.000Z',
    },
    {
      id: 'PAY-401',
      booking_id: 'BKG-004',
      amount_cents: 452000,
      currency: 'GTQ',
      method: 'cash',
      status: 'completed',
      transaction_reference: 'RCB-0004',
      paid_at: '2026-08-23T11:00:00.000Z',
      processed_by_user_id: 'USR-001',
      created_at: '2026-08-23T11:00:00.000Z',
    },
  ],

  // --- Depósitos --------------------------------------------------------
  deposits: [
    {
      id: 'DEP-001',
      booking_id: 'BKG-003',
      guest_id: 'GST-003',
      amount_cents: 50000,
      currency: 'GTQ',
      method: 'cash',
      status: 'held',
      collected_at: '2026-09-07T14:00:00.000Z',
      created_at: '2026-09-07T14:00:00.000Z',
      updated_at: '2026-09-07T14:00:00.000Z',
    },
    {
      id: 'DEP-002',
      booking_id: 'BKG-004',
      guest_id: 'GST-004',
      amount_cents: 100000,
      currency: 'GTQ',
      method: 'credit_card',
      status: 'refunded',
      collected_at: '2026-08-20T14:00:00.000Z',
      refunded_at: '2026-08-23T11:00:00.000Z',
      created_at: '2026-08-20T14:00:00.000Z',
      updated_at: '2026-08-23T11:00:00.000Z',
    },
    {
      id: 'DEP-003',
      booking_id: 'BKG-002',
      guest_id: 'GST-002',
      amount_cents: 50000,
      currency: 'GTQ',
      method: 'bank_transfer',
      status: 'held',
      collected_at: '2026-09-09T11:00:00.000Z',
      created_at: '2026-09-09T11:00:00.000Z',
      updated_at: '2026-09-09T11:00:00.000Z',
    },
  ],

  // --- Caja: jornadas -----------------------------------------------
  //
  // CS-001 cierra sin diferencia, CS-002 cierra CON diferencia (el caso
  // interesante que pide la FASE 2), CS-003 queda abierta. El saldo de
  // apertura de cada jornada es el saldo contado (no el esperado) de la
  // anterior — así es como cuadra una caja real.
  // `expected_balance_cents` es opening + ingresos - egresos: valor
  // guardado, verificado aritméticamente en `scripts/test-lot-c-d.mjs`.
  cashSessions: [
    {
      id: 'CS-001',
      opened_by_user_id: 'USR-001',
      opened_at: '2026-09-08T08:00:00.000Z',
      opening_balance_cents: 500000,
      currency: 'GTQ',
      status: 'closed',
      closed_by_user_id: 'USR-002',
      closed_at: '2026-09-08T20:00:00.000Z',
      expected_balance_cents: 685000,
      counted_balance_cents: 685000,
      difference_cents: 0,
      created_at: '2026-09-08T08:00:00.000Z',
      updated_at: '2026-09-08T20:00:00.000Z',
    },
    {
      id: 'CS-002',
      opened_by_user_id: 'USR-001',
      opened_at: '2026-09-09T08:00:00.000Z',
      opening_balance_cents: 685000,
      currency: 'GTQ',
      status: 'closed',
      closed_by_user_id: 'USR-002',
      closed_at: '2026-09-09T20:00:00.000Z',
      expected_balance_cents: 1257000,
      counted_balance_cents: 1253000,
      difference_cents: -4000,
      notes:
        'Faltante sin explicar; se reportó a administración y se revisó la grabación de cámaras.',
      created_at: '2026-09-09T08:00:00.000Z',
      updated_at: '2026-09-09T20:00:00.000Z',
    },
    {
      id: 'CS-003',
      opened_by_user_id: 'USR-001',
      opened_at: '2026-09-10T08:00:00.000Z',
      opening_balance_cents: 1253000,
      currency: 'GTQ',
      status: 'open',
      created_at: '2026-09-10T08:00:00.000Z',
      updated_at: '2026-09-10T08:00:00.000Z',
    },
  ],

  cashMovements: [
    {
      id: 'CMV-001',
      cash_session_id: 'CS-001',
      type: 'income',
      concept: 'Pago parcial — reserva BKG-003',
      amount_cents: 200000,
      currency: 'GTQ',
      responsible_user_id: 'USR-001',
      occurred_at: '2026-09-08T18:00:00.000Z',
      payment_id: 'PAY-101',
      created_at: '2026-09-08T18:00:00.000Z',
    },
    {
      id: 'CMV-002',
      cash_session_id: 'CS-001',
      type: 'expense',
      concept: 'Compra de insumos de limpieza',
      amount_cents: 15000,
      currency: 'GTQ',
      responsible_user_id: 'USR-002',
      occurred_at: '2026-09-08T16:00:00.000Z',
      created_at: '2026-09-08T16:00:00.000Z',
    },
    {
      id: 'CMV-003',
      cash_session_id: 'CS-002',
      type: 'income',
      concept: 'Pago total anticipado — reserva BKG-009',
      amount_cents: 300000,
      currency: 'GTQ',
      responsible_user_id: 'USR-001',
      occurred_at: '2026-09-09T10:00:00.000Z',
      payment_id: 'PAY-201',
      created_at: '2026-09-09T10:00:00.000Z',
    },
    {
      id: 'CMV-004',
      cash_session_id: 'CS-002',
      type: 'income',
      concept: 'Pago con sobrepago — reserva BKG-002',
      amount_cents: 280000,
      currency: 'GTQ',
      responsible_user_id: 'USR-001',
      occurred_at: '2026-09-09T11:00:00.000Z',
      payment_id: 'PAY-301',
      created_at: '2026-09-09T11:00:00.000Z',
    },
    {
      id: 'CMV-005',
      cash_session_id: 'CS-002',
      type: 'expense',
      concept: 'Reparación de la cerradura de una habitación',
      amount_cents: 8000,
      currency: 'GTQ',
      responsible_user_id: 'USR-002',
      occurred_at: '2026-09-09T15:00:00.000Z',
      created_at: '2026-09-09T15:00:00.000Z',
    },
    {
      id: 'CMV-006',
      cash_session_id: 'CS-003',
      type: 'income',
      concept: 'Venta de artículos de conveniencia en recepción',
      amount_cents: 5000,
      currency: 'GTQ',
      responsible_user_id: 'USR-001',
      occurred_at: '2026-09-10T09:00:00.000Z',
      created_at: '2026-09-10T09:00:00.000Z',
    },
    {
      id: 'CMV-007',
      cash_session_id: 'CS-003',
      type: 'expense',
      concept: 'Compra de café y azúcar para recepción',
      amount_cents: 3000,
      currency: 'GTQ',
      responsible_user_id: 'USR-002',
      occurred_at: '2026-09-10T09:30:00.000Z',
      created_at: '2026-09-10T09:30:00.000Z',
    },
  ],
};
