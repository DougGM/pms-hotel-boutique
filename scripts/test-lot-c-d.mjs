import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amenities,
  cashMovements,
  cashSessions,
  charges,
  deposits,
  guestAccounts,
  inventoryItems,
  inventoryMovements,
  payments,
  products,
  users,
} from './fixtures/domain-fixtures.mjs';

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/shared/utils/amenitySchedule.ts'],
  outdir: '.cache',
  outbase: 'src',
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  tsconfig: 'tsconfig.app.json',
});

const require = createRequire(import.meta.url);
const { isAmenityOpenAt } = require(require.resolve('../.cache/shared/utils/amenitySchedule.cjs'));

test('guestAccount: balance_cents coincide con cargos menos pagos y depositos activos', () => {
  for (const account of guestAccounts) {
    const accountCharges = charges.filter(
      (charge) => charge.booking_id === account.booking_id && charge.status !== 'voided',
    );
    const accountPayments = payments.filter(
      (payment) => payment.booking_id === account.booking_id && payment.status === 'completed',
    );
    const accountDeposits = deposits.filter(
      (deposit) => deposit.booking_id === account.booking_id && deposit.status !== 'refunded',
    );
    const chargesTotal = accountCharges.reduce((sum, charge) => sum + charge.amount_cents, 0);
    const paymentsTotal = accountPayments.reduce((sum, payment) => sum + payment.amount_cents, 0);
    const depositsTotal = accountDeposits.reduce((sum, deposit) => sum + deposit.amount_cents, 0);
    assert.equal(account.balance_cents, chargesTotal - paymentsTotal - depositsTotal);
  }
});

test('charge: el cargo anulado conserva motivo y no cuenta en saldos', () => {
  const voided = charges.filter((charge) => charge.status === 'voided');
  assert.ok(voided.length > 0);
  assert.ok(voided.every((charge) => charge.void_reason));
});

test('cashSession: expected_balance_cents y difference_cents coinciden con movimientos', () => {
  for (const session of cashSessions) {
    if (session.expected_balance_cents === undefined) continue;
    const movements = cashMovements.filter((movement) => movement.cash_session_id === session.id);
    const income = movements
      .filter((movement) => movement.type === 'income')
      .reduce((sum, movement) => sum + movement.amount_cents, 0);
    const expense = movements
      .filter((movement) => movement.type === 'expense')
      .reduce((sum, movement) => sum + movement.amount_cents, 0);
    assert.equal(session.expected_balance_cents, session.opening_balance_cents + income - expense);
    if (session.status === 'closed') {
      assert.equal(
        session.difference_cents,
        session.counted_balance_cents - session.expected_balance_cents,
      );
    }
  }
  assert.ok(cashSessions.some((session) => session.status === 'open'));
});

test('inventoryItem: current_quantity coincide con entradas menos salidas', () => {
  for (const item of inventoryItems) {
    const movements = inventoryMovements.filter(
      (movement) => movement.inventory_item_id === item.id,
    );
    const inTotal = movements
      .filter((movement) => movement.type === 'in')
      .reduce((sum, movement) => sum + movement.quantity, 0);
    const outTotal = movements
      .filter((movement) => movement.type === 'out')
      .reduce((sum, movement) => sum + movement.quantity, 0);
    assert.equal(item.current_quantity, inTotal - outTotal);
  }
  assert.ok(inventoryItems.some((item) => item.current_quantity < item.minimum_quantity));
});

test('isAmenityOpenAt: horario con ventana y servicio continuo', () => {
  const pool = amenities.find((amenity) => amenity.id === 'AMN-01');
  assert.ok(
    isAmenityOpenAt(
      { opensAt: pool.opens_at, closesAt: pool.closes_at },
      new Date('2026-10-03T10:00:00'),
    ),
  );
  assert.ok(
    !isAmenityOpenAt(
      { opensAt: pool.opens_at, closesAt: pool.closes_at },
      new Date('2026-10-03T22:00:00'),
    ),
  );

  const wifi = amenities.find((amenity) => amenity.id === 'AMN-02');
  assert.ok(
    isAmenityOpenAt(
      { opensAt: wifi.opens_at, closesAt: wifi.closes_at },
      new Date('2026-10-03T02:00:00'),
    ),
  );
});

test('catalogos operativos conservan casos inactivos para auditoria', () => {
  assert.ok(users.some((user) => user.status === 'inactive'));
  assert.ok(products.some((product) => !product.active));
  assert.ok(amenities.some((amenity) => !amenity.active));
});
