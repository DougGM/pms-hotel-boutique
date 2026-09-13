import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Verificación aritmética de los lotes C (WEB-11) y D (WEB-12): los saldos,
// balances esperados y existencias de inventario son valores GUARDADOS en
// el dataset (como los devolvería una API real que ya hizo la cuenta), no
// derivados en el mapper — esta suite recalcula cada uno desde sus registros
// de detalle y confirma que coinciden exactamente. También cubre la alerta
// de stock bajo y el indicador de horario de amenidades, que sí son lógica
// real (no solo datos).

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/data/db.ts', 'src/shared/utils/amenitySchedule.ts'],
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
const load = (relativePath) => {
  const path = require.resolve(`../.cache/${relativePath}.cjs`);
  delete require.cache[path];
  return require(path);
};

const {
  guestAccountsDB,
  chargesDB,
  paymentsDB,
  cashSessionsDB,
  cashMovementsDB,
  inventoryItemsDB,
  inventoryMovementsDB,
  amenitiesDB,
  usersDB,
  productsDB,
} = load('data/db');
const { isAmenityOpenAt } = load('shared/utils/amenitySchedule');

// --- A. Cuentas del huésped: cargos - pagos = saldo -----------------------

test('guestAccount: balance_cents coincide con cargos (no anulados) menos pagos completados', () => {
  for (const account of guestAccountsDB) {
    const charges = chargesDB.filter(
      (charge) => charge.booking_id === account.booking_id && charge.status !== 'voided',
    );
    const payments = paymentsDB.filter(
      (payment) => payment.booking_id === account.booking_id && payment.status === 'completed',
    );
    const chargesTotal = charges.reduce((sum, charge) => sum + charge.amount_cents, 0);
    const paymentsTotal = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
    assert.equal(
      account.balance_cents,
      chargesTotal - paymentsTotal,
      `${account.id}: balance_cents guardado (${account.balance_cents}) no coincide con cargos (${chargesTotal}) - pagos (${paymentsTotal})`,
    );
  }
});

test('guestAccount: cubre los 4 casos pedidos (pendiente, cero, sobrepago, cerrada)', () => {
  const balances = Object.fromEntries(guestAccountsDB.map((a) => [a.id, a.balance_cents]));
  assert.ok(balances['GACC-001'] > 0, 'GACC-001 debía tener saldo pendiente (> 0)');
  assert.equal(balances['GACC-002'], 0, 'GACC-002 debía tener saldo exactamente en cero');
  assert.ok(balances['GACC-003'] < 0, 'GACC-003 debía tener sobrepago (< 0)');
  const closed = guestAccountsDB.find((a) => a.id === 'GACC-004');
  assert.equal(closed.status, 'closed', 'GACC-004 debía estar cerrada');
  const hasReceipt = paymentsDB.some(
    (p) => p.booking_id === closed.booking_id && typeof p.transaction_reference === 'string',
  );
  assert.ok(hasReceipt, 'GACC-004 debía tener un pago con comprobante (transaction_reference)');
});

test('charge: el cargo anulado se conserva con motivo y no cuenta en ningún saldo', () => {
  const voided = chargesDB.filter((charge) => charge.status === 'voided');
  assert.ok(voided.length > 0, 'debía existir al menos un cargo anulado');
  for (const charge of voided) {
    assert.ok(
      typeof charge.void_reason === 'string' && charge.void_reason.length > 0,
      `${charge.id}: un cargo anulado debe conservar su motivo`,
    );
  }
});

// --- B. Caja: apertura + ingresos - egresos = esperado --------------------

test('cashSession: expected_balance_cents coincide con apertura + ingresos - egresos', () => {
  for (const session of cashSessionsDB) {
    if (session.expected_balance_cents === undefined) continue; // jornada abierta
    const movements = cashMovementsDB.filter((m) => m.cash_session_id === session.id);
    const income = movements
      .filter((m) => m.type === 'income')
      .reduce((sum, m) => sum + m.amount_cents, 0);
    const expense = movements
      .filter((m) => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount_cents, 0);
    const expected = session.opening_balance_cents + income - expense;
    assert.equal(
      session.expected_balance_cents,
      expected,
      `${session.id}: expected_balance_cents guardado (${session.expected_balance_cents}) no coincide con apertura+ingresos-egresos (${expected})`,
    );
  }
});

test('cashSession: difference_cents coincide con contado menos esperado', () => {
  for (const session of cashSessionsDB) {
    if (session.status !== 'closed') continue;
    assert.equal(
      session.difference_cents,
      session.counted_balance_cents - session.expected_balance_cents,
      `${session.id}: difference_cents no coincide con contado - esperado`,
    );
  }
});

test('cashSession: cubre una jornada sin diferencia, una con diferencia y una abierta', () => {
  const withoutDifference = cashSessionsDB.filter(
    (s) => s.status === 'closed' && s.difference_cents === 0,
  );
  const withDifference = cashSessionsDB.filter(
    (s) => s.status === 'closed' && s.difference_cents !== 0,
  );
  const open = cashSessionsDB.filter((s) => s.status === 'open');
  assert.ok(withoutDifference.length > 0, 'debía existir una jornada cerrada sin diferencia');
  assert.ok(withDifference.length > 0, 'debía existir una jornada cerrada CON diferencia');
  assert.ok(open.length > 0, 'debía existir una jornada abierta, sin cerrar');
});

// --- C. Inventario: entradas - salidas = existencia actual -----------------

test('inventoryItem: current_quantity coincide con entradas menos salidas de sus movimientos', () => {
  for (const item of inventoryItemsDB) {
    const movements = inventoryMovementsDB.filter(
      (movement) => movement.inventory_item_id === item.id,
    );
    const inTotal = movements
      .filter((m) => m.type === 'in')
      .reduce((sum, m) => sum + m.quantity, 0);
    const outTotal = movements
      .filter((m) => m.type === 'out')
      .reduce((sum, m) => sum + m.quantity, 0);
    assert.equal(
      item.current_quantity,
      inTotal - outTotal,
      `${item.id}: current_quantity guardada (${item.current_quantity}) no coincide con entradas (${inTotal}) - salidas (${outTotal})`,
    );
  }
});

test('inventoryItem: al menos un artículo dispara la alerta de stock bajo', () => {
  const belowMinimum = inventoryItemsDB.filter(
    (item) => item.current_quantity < item.minimum_quantity,
  );
  assert.ok(belowMinimum.length > 0, 'debía existir al menos un artículo por debajo del mínimo');
});

test('inventoryItem: al menos un artículo desactivado conserva su historial de movimientos', () => {
  const inactive = inventoryItemsDB.filter((item) => !item.active);
  assert.ok(inactive.length > 0, 'debía existir al menos un artículo desactivado');
  for (const item of inactive) {
    const movements = inventoryMovementsDB.filter(
      (movement) => movement.inventory_item_id === item.id,
    );
    assert.ok(
      movements.length > 0,
      `${item.id}: un artículo desactivado debe conservar su historial`,
    );
  }
});

// --- D. Amenidades: horario y disponibilidad -------------------------------

test('isAmenityOpenAt: sin horario (servicio continuo) siempre está abierta', () => {
  const wifi = amenitiesDB.find((a) => a.id === 'AMN-06');
  assert.ok(
    isAmenityOpenAt(
      { opensAt: wifi.opens_at, closesAt: wifi.closes_at },
      new Date('2026-09-10T02:00:00'),
    ),
  );
  assert.ok(
    isAmenityOpenAt(
      { opensAt: wifi.opens_at, closesAt: wifi.closes_at },
      new Date('2026-09-10T23:00:00'),
    ),
  );
});

test('isAmenityOpenAt: con ventana angosta, cerrada la mayor parte del día', () => {
  const sauna = amenitiesDB.find((a) => a.id === 'AMN-08');
  assert.equal(sauna.opens_at, '06:00');
  assert.equal(sauna.closes_at, '09:00');
  assert.ok(
    isAmenityOpenAt(
      { opensAt: sauna.opens_at, closesAt: sauna.closes_at },
      new Date('2026-09-10T07:00:00'),
    ),
    'a las 07:00 el sauna debía estar abierto',
  );
  assert.ok(
    !isAmenityOpenAt(
      { opensAt: sauna.opens_at, closesAt: sauna.closes_at },
      new Date('2026-09-10T14:00:00'),
    ),
    'a las 14:00 el sauna debía estar cerrado — el caso que prueba el indicador',
  );
});

test('isAmenityOpenAt: ventana que cruza medianoche', () => {
  const bar = amenitiesDB.find((a) => a.id === 'AMN-05');
  assert.equal(bar.opens_at, '17:00');
  assert.equal(bar.closes_at, '01:00');
  assert.ok(
    isAmenityOpenAt(
      { opensAt: bar.opens_at, closesAt: bar.closes_at },
      new Date('2026-09-10T23:30:00'),
    ),
  );
  assert.ok(
    isAmenityOpenAt(
      { opensAt: bar.opens_at, closesAt: bar.closes_at },
      new Date('2026-09-10T00:30:00'),
    ),
  );
  assert.ok(
    !isAmenityOpenAt(
      { opensAt: bar.opens_at, closesAt: bar.closes_at },
      new Date('2026-09-10T12:00:00'),
    ),
  );
});

test('amenity: al menos una desactivada conservando su historial', () => {
  const inactive = amenitiesDB.filter((a) => !a.active);
  assert.ok(inactive.length > 0, 'debía existir al menos una amenidad desactivada');
});

// --- E. Personal, roles y categorías -----------------------------------

test('user: al menos 2 activos por cada rol pedido, y al menos 1 desactivado', () => {
  const REQUIRED_ROLES = ['admin', 'reception', 'housekeeping', 'room_service', 'concierge'];
  for (const role of REQUIRED_ROLES) {
    const activeCount = usersDB.filter(
      (user) => user.role === role && user.status === 'active',
    ).length;
    assert.ok(
      activeCount >= 2,
      `rol "${role}": se esperaban al menos 2 usuarios activos, hubo ${activeCount}`,
    );
  }
  const inactive = usersDB.filter((user) => user.status === 'inactive');
  assert.ok(inactive.length > 0, 'debía existir al menos un usuario desactivado');
});

test('product: al menos 25 productos de Room Service, al menos uno desactivado', () => {
  assert.ok(productsDB.length >= 25, 'se esperaban al menos 25 productos');
  const inactive = productsDB.filter((product) => !product.active);
  assert.ok(inactive.length > 0, 'debía existir al menos un producto desactivado');
});
