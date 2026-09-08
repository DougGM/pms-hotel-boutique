import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/services/mockData.ts', 'src/shared/utils/currency.ts'],
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

const { mockPayments, mockRooms, mockBookings, mockProducts } = load('services/mockData');
const { formatCurrency } = load('shared/utils/currency');

// --- A. mockPayments --------------------------------------------------

test('mockPayments: existen registros', () => {
  assert.ok(Array.isArray(mockPayments) && mockPayments.length > 0);
});

test('mockPayments: amountCents es entero en cada registro', () => {
  for (const payment of mockPayments) {
    assert.ok(
      Number.isInteger(payment.amountCents),
      `payment ${payment.id}: amountCents no es entero (${payment.amountCents})`,
    );
  }
});

test('mockPayments: currency es GTQ en cada registro', () => {
  for (const payment of mockPayments) {
    assert.equal(payment.currency, 'GTQ', `payment ${payment.id}: currency no es GTQ`);
  }
});

// --- B. mockRooms -------------------------------------------------------

test('mockRooms: pricePerNightCents es entero en cada registro', () => {
  for (const room of mockRooms) {
    assert.ok(
      Number.isInteger(room.pricePerNightCents),
      `room ${room.id}: pricePerNightCents no es entero (${room.pricePerNightCents})`,
    );
  }
});

test('mockRooms: currency es GTQ en cada registro', () => {
  for (const room of mockRooms) {
    assert.equal(room.currency, 'GTQ', `room ${room.id}: currency no es GTQ`);
  }
});

// --- C. mockBookings ------------------------------------------------------

test('mockBookings: pricePerNightCents y totalAmountCents son enteros en cada registro', () => {
  for (const booking of mockBookings) {
    assert.ok(
      Number.isInteger(booking.pricePerNightCents),
      `booking ${booking.id}: pricePerNightCents no es entero (${booking.pricePerNightCents})`,
    );
    assert.ok(
      Number.isInteger(booking.totalAmountCents),
      `booking ${booking.id}: totalAmountCents no es entero (${booking.totalAmountCents})`,
    );
  }
});

test('mockBookings: currency es GTQ en cada registro', () => {
  for (const booking of mockBookings) {
    assert.equal(booking.currency, 'GTQ', `booking ${booking.id}: currency no es GTQ`);
  }
});

// --- D. mockProducts --------------------------------------------------

test('mockProducts: priceCents es entero en cada registro', () => {
  for (const product of mockProducts) {
    assert.ok(
      Number.isInteger(product.priceCents),
      `product ${product.id}: priceCents no es entero (${product.priceCents})`,
    );
  }
});

test('mockProducts: currency es GTQ en cada registro', () => {
  for (const product of mockProducts) {
    assert.equal(product.currency, 'GTQ', `product ${product.id}: currency no es GTQ`);
  }
});

// --- E. Formatter ---------------------------------------------------------

test('formatCurrency: 125000 centavos -> Q1,250.00', () => {
  assert.equal(formatCurrency(125000), 'Q1,250.00');
});

test('formatCurrency: formatea el monto real del primer mockPayment sin lanzar', () => {
  const [payment] = mockPayments;
  const formatted = formatCurrency(payment.amountCents, payment.currency);
  assert.match(formatted, /^Q[\d,]+\.\d{2}$/);
});

test('formatCurrency: rechaza centavos no enteros (guarda de regresión de la ETAPA 1)', () => {
  assert.throws(() => formatCurrency(1.5));
});

// --- F. Contrato de nombres *Cents -----------------------------------------
//
// Se valida sobre las claves reales de los mocks activos (no con una regex
// sobre el código fuente) para no duplicar la fuente de verdad ni depender
// de detalles de formato del archivo.

test('contrato: los campos monetarios activos usan sufijo Cents, no los nombres legacy en decimal', () => {
  const [payment] = mockPayments;
  const [room] = mockRooms;
  const [booking] = mockBookings;
  const [product] = mockProducts;

  assert.ok('amountCents' in payment, 'Payment debe tener amountCents');
  assert.ok(!('amount' in payment), 'Payment ya no debe tener amount decimal');

  assert.ok('pricePerNightCents' in room, 'Room debe tener pricePerNightCents');
  assert.ok(!('pricePerNight' in room), 'Room ya no debe tener pricePerNight decimal');

  assert.ok('pricePerNightCents' in booking, 'Booking debe tener pricePerNightCents');
  assert.ok(!('pricePerNight' in booking), 'Booking ya no debe tener pricePerNight decimal');
  assert.ok('totalAmountCents' in booking, 'Booking debe tener totalAmountCents');
  assert.ok(!('totalAmount' in booking), 'Booking ya no debe tener totalAmount decimal');

  assert.ok('priceCents' in product, 'Product debe tener priceCents');
  assert.ok(!('price' in product), 'Product ya no debe tener price decimal');
});
