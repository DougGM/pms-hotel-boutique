import { build } from 'esbuild';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Verificación aritmética de los lotes C (WEB-11) y D (WEB-12): los saldos,
// balances esperados y existencias de inventario son valores GUARDADOS en
// los datasets (como los devolvería una API real que ya hizo la cuenta),
// no derivados en el mapper — esta suite recalcula cada uno desde sus
// registros de detalle y confirma que coinciden exactamente. También
// cubre la alerta de stock bajo y el indicador de horario de amenidades,
// que sí son lógica real (no solo datos).

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: [
    'src/shared/mocks/lot-c.ts',
    'src/shared/mocks/lot-d.ts',
    'src/shared/utils/amenitySchedule.ts',
    'src/shared/utils/inventoryConsumption.ts',
    'src/shared/types/entities/product/index.ts',
    'src/shared/constants/catalog-categories.ts',
  ],
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

const { lotCMockData } = load('shared/mocks/lot-c');
const { lotDMockData } = load('shared/mocks/lot-d');
const { isAmenityOpenAt } = load('shared/utils/amenitySchedule');
const { calculateInventoryConsumption } = load('shared/utils/inventoryConsumption');
const productMapper = load('shared/types/entities/product/index');

// --- A. Cuentas del huésped: cargos - pagos = saldo -----------------------

test('guestAccount: balance_cents coincide con cargos (no anulados) menos pagos completados', () => {
  for (const account of lotCMockData.guestAccounts) {
    const charges = lotCMockData.charges.filter(
      (charge) => charge.booking_id === account.booking_id && charge.status !== 'voided',
    );
    const payments = lotCMockData.payments.filter(
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
  const balances = Object.fromEntries(
    lotCMockData.guestAccounts.map((a) => [a.id, a.balance_cents]),
  );
  assert.ok(balances['GACC-001'] > 0, 'GACC-001 debía tener saldo pendiente (> 0)');
  assert.equal(balances['GACC-002'], 0, 'GACC-002 debía tener saldo exactamente en cero');
  assert.ok(balances['GACC-003'] < 0, 'GACC-003 debía tener sobrepago (< 0)');
  const closed = lotCMockData.guestAccounts.find((a) => a.id === 'GACC-004');
  assert.equal(closed.status, 'closed', 'GACC-004 debía estar cerrada');
  const hasReceipt = lotCMockData.payments.some(
    (p) => p.booking_id === closed.booking_id && typeof p.transaction_reference === 'string',
  );
  assert.ok(hasReceipt, 'GACC-004 debía tener un pago con comprobante (transaction_reference)');
});

test('charge: el cargo anulado se conserva con motivo y no cuenta en ningún saldo', () => {
  const voided = lotCMockData.charges.filter((charge) => charge.status === 'voided');
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
  for (const session of lotCMockData.cashSessions) {
    if (session.expected_balance_cents === undefined) continue; // jornada abierta
    const movements = lotCMockData.cashMovements.filter((m) => m.cash_session_id === session.id);
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
  for (const session of lotCMockData.cashSessions) {
    if (session.status !== 'closed') continue;
    assert.equal(
      session.difference_cents,
      session.counted_balance_cents - session.expected_balance_cents,
      `${session.id}: difference_cents no coincide con contado - esperado`,
    );
  }
});

test('cashSession: cubre una jornada sin diferencia, una con diferencia y una abierta', () => {
  const withoutDifference = lotCMockData.cashSessions.filter(
    (s) => s.status === 'closed' && s.difference_cents === 0,
  );
  const withDifference = lotCMockData.cashSessions.filter(
    (s) => s.status === 'closed' && s.difference_cents !== 0,
  );
  const open = lotCMockData.cashSessions.filter((s) => s.status === 'open');
  assert.ok(withoutDifference.length > 0, 'debía existir una jornada cerrada sin diferencia');
  assert.ok(withDifference.length > 0, 'debía existir una jornada cerrada CON diferencia');
  assert.ok(open.length > 0, 'debía existir una jornada abierta, sin cerrar');
});

// --- C. Inventario: entradas - salidas = existencia actual -----------------

test('inventoryItem: current_quantity coincide con entradas menos salidas de sus movimientos', () => {
  for (const item of lotDMockData.inventoryItems) {
    const movements = lotDMockData.inventoryMovements.filter(
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
  const belowMinimum = lotDMockData.inventoryItems.filter(
    (item) => item.current_quantity < item.minimum_quantity,
  );
  assert.ok(belowMinimum.length > 0, 'debía existir al menos un artículo por debajo del mínimo');
});

test('inventoryItem: al menos un artículo desactivado conserva su historial de movimientos', () => {
  const inactive = lotDMockData.inventoryItems.filter((item) => !item.active);
  assert.ok(inactive.length > 0, 'debía existir al menos un artículo desactivado');
  for (const item of inactive) {
    const movements = lotDMockData.inventoryMovements.filter(
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
  const wifi = lotDMockData.amenities.find((a) => a.id === 'AMN-06');
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
  const sauna = lotDMockData.amenities.find((a) => a.id === 'AMN-08');
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
  const bar = lotDMockData.amenities.find((a) => a.id === 'AMN-05');
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
  const inactive = lotDMockData.amenities.filter((a) => !a.active);
  assert.ok(inactive.length > 0, 'debía existir al menos una amenidad desactivada');
});

// --- E. Personal, roles y categorías -----------------------------------

test('user: al menos 2 activos por cada rol pedido, y al menos 1 desactivado', () => {
  const REQUIRED_ROLES = ['admin', 'front_desk', 'housekeeping', 'room_service', 'concierge'];
  for (const role of REQUIRED_ROLES) {
    const activeCount = lotDMockData.users.filter(
      (user) => user.role === role && user.status === 'active',
    ).length;
    assert.ok(
      activeCount >= 2,
      `rol "${role}": se esperaban al menos 2 usuarios activos, hubo ${activeCount}`,
    );
  }
  const inactive = lotDMockData.users.filter((user) => user.status === 'inactive');
  assert.ok(inactive.length > 0, 'debía existir al menos un usuario desactivado');
});

test('product: al menos 25 productos de Room Service, al menos uno desactivado', () => {
  assert.ok(lotDMockData.products.length >= 25, 'se esperaban al menos 25 productos');
  const inactive = lotDMockData.products.filter((product) => !product.active);
  assert.ok(inactive.length > 0, 'debía existir al menos un producto desactivado');
});

// --- F. Consumo de inventario por producto (PR #36, D-006) ----------------
//
// El vínculo producto <-> inventario ya no es una FK 1 a 1
// (`inventory_item.product_id`, retirado) sino una lista de consumo con
// cantidad en `product.inventory_consumption`, resuelta por la única
// función compartida `calculateInventoryConsumption`. Cubre los 4 casos
// pedidos: un artículo, varios artículos, ninguno, y unidad de venta
// distinta de la de almacén.

const productModel = (id) => productMapper.toDomain(lotDMockData.products.find((p) => p.id === id));

test('calculateInventoryConsumption: producto que consume exactamente un artículo (botella de agua)', () => {
  const result = calculateInventoryConsumption(productModel('PRD-001'), 3);
  assert.deepEqual(result, [{ inventoryItemId: 'INV-001', quantity: 3 }]);
});

test('calculateInventoryConsumption: producto que consume varios artículos (club sandwich)', () => {
  const result = calculateInventoryConsumption(productModel('PRD-010'), 2);
  assert.deepEqual(result, [
    { inventoryItemId: 'INV-011', quantity: 4 },
    { inventoryItemId: 'INV-012', quantity: 0.1 },
    { inventoryItemId: 'INV-013', quantity: 0.06 },
  ]);
});

test('calculateInventoryConsumption: producto que no consume ningún artículo (servicio de planchado)', () => {
  const result = calculateInventoryConsumption(productModel('PRD-024'), 5);
  assert.deepEqual(result, []);
});

test('calculateInventoryConsumption: unidad de venta distinta de la de almacén (café por taza, almacenado en kg)', () => {
  const cafeItem = lotDMockData.inventoryItems.find((item) => item.id === 'INV-014');
  assert.equal(cafeItem.unit, 'kg', 'el café en grano se almacena en kg, no "por taza"');
  const result = calculateInventoryConsumption(productModel('PRD-017'), 1);
  assert.deepEqual(result, [{ inventoryItemId: 'INV-014', quantity: 0.018 }]);
});

test('product.inventory_consumption: toda cantidad es positiva', () => {
  for (const product of lotDMockData.products) {
    for (const line of product.inventory_consumption ?? []) {
      assert.ok(
        line.quantity > 0,
        `${product.id}: inventory_consumption de "${line.inventory_item_id}" debe ser positivo`,
      );
    }
  }
});

// --- G. Taxonomía de categorías compartida (D-006) -------------------------

const { CATALOG_CATEGORY_DTOS } = load('shared/constants/catalog-categories');
const VALID_CATEGORIES = new Set(CATALOG_CATEGORY_DTOS);

test('product.category y inventoryItem.category pertenecen a la taxonomía compartida', () => {
  for (const product of lotDMockData.products) {
    assert.ok(
      VALID_CATEGORIES.has(product.category),
      `${product.id}: categoría "${product.category}" no pertenece a la taxonomía compartida`,
    );
  }
  for (const item of lotDMockData.inventoryItems) {
    assert.ok(
      VALID_CATEGORIES.has(item.category),
      `${item.id}: categoría "${item.category}" no pertenece a la taxonomía compartida`,
    );
  }
});

test('inventoryItem: un artículo vinculado a un producto usa la misma categoría que ese producto', () => {
  for (const product of lotDMockData.products) {
    for (const line of product.inventory_consumption ?? []) {
      const item = lotDMockData.inventoryItems.find((entry) => entry.id === line.inventory_item_id);
      assert.equal(
        item.category,
        product.category,
        `${item.id} (${item.category}) debía compartir categoría con ${product.id} (${product.category})`,
      );
    }
  }
});

// --- H. Verificación estática: nadie reimplementa el cálculo de consumo ----

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(fullPath)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// Heurística: alguien que reimplemente el descuento tiene que leer
// `inventoryConsumption` y multiplicar por una cantidad — si aparece fuera
// de la única función compartida, esta prueba lo atrapa.
const CONSUMPTION_CALCULATION = /inventoryConsumption[\s\S]{0,120}quantity\s*\*/;

test('verificación estática: ninguna pantalla reimplementa el cálculo de consumo de inventario', async () => {
  const ALLOWED = [path.normalize('src/shared/utils/inventoryConsumption.ts')];
  const files = await collectSourceFiles('src');
  const offenders = [];
  for (const file of files) {
    if (ALLOWED.includes(path.normalize(file))) continue;
    const content = await readFile(file, 'utf8');
    if (CONSUMPTION_CALCULATION.test(content)) offenders.push(file);
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `estos archivos reimplementan el cálculo de consumo fuera de shared/utils/inventoryConsumption.ts: ${offenders.join(', ')}`,
  );
});
