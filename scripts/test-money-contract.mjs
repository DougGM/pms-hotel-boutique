import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/data/db.ts', 'src/shared/utils/currency.ts'],
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

const { paymentsDB, ratesDB, bookingsDB, productsDB } = load('data/db');
const { formatCurrency } = load('shared/utils/currency');

// --- A. paymentsDB --------------------------------------------------

test('paymentsDB: existen registros', () => {
  assert.ok(Array.isArray(paymentsDB) && paymentsDB.length > 0);
});

test('paymentsDB: amount_cents es entero en cada registro', () => {
  for (const payment of paymentsDB) {
    assert.ok(
      Number.isInteger(payment.amount_cents),
      `payment ${payment.id}: amount_cents no es entero (${payment.amount_cents})`,
    );
  }
});

test('paymentsDB: currency es GTQ en cada registro', () => {
  for (const payment of paymentsDB) {
    assert.equal(payment.currency, 'GTQ', `payment ${payment.id}: currency no es GTQ`);
  }
});

// --- B. ratesDB ---------------------------------------------------------
//
// El precio por noche ya no vive en Room (WEB-09 lo mueve a Rate, ligada a
// RoomType): un Room real no trae el precio embebido.

test('ratesDB: price_cents es entero en cada registro', () => {
  for (const rate of ratesDB) {
    assert.ok(
      Number.isInteger(rate.price_cents),
      `rate ${rate.id}: price_cents no es entero (${rate.price_cents})`,
    );
  }
});

test('ratesDB: currency es GTQ en cada registro', () => {
  for (const rate of ratesDB) {
    assert.equal(rate.currency, 'GTQ', `rate ${rate.id}: currency no es GTQ`);
  }
});

// --- C. bookingsDB ------------------------------------------------------

test('bookingsDB: total_amount_cents es entero en cada registro', () => {
  for (const booking of bookingsDB) {
    assert.ok(
      Number.isInteger(booking.total_amount_cents),
      `booking ${booking.id}: total_amount_cents no es entero (${booking.total_amount_cents})`,
    );
  }
});

test('bookingsDB: currency es GTQ en cada registro', () => {
  for (const booking of bookingsDB) {
    assert.equal(booking.currency, 'GTQ', `booking ${booking.id}: currency no es GTQ`);
  }
});

// --- D. productsDB --------------------------------------------------

test('productsDB: price_cents es entero en cada registro', () => {
  for (const product of productsDB) {
    assert.ok(
      Number.isInteger(product.price_cents),
      `product ${product.id}: price_cents no es entero (${product.price_cents})`,
    );
  }
});

test('productsDB: currency es GTQ en cada registro', () => {
  for (const product of productsDB) {
    assert.equal(product.currency, 'GTQ', `product ${product.id}: currency no es GTQ`);
  }
});

// --- E. Formatter ---------------------------------------------------------

test('formatCurrency: 125000 centavos -> Q1,250.00', () => {
  assert.equal(formatCurrency(125000), 'Q1,250.00');
});

test('formatCurrency: formatea el monto real del primer payment sin lanzar', () => {
  const [payment] = paymentsDB;
  const formatted = formatCurrency(payment.amount_cents, payment.currency);
  assert.match(formatted, /^Q[\d,]+\.\d{2}$/);
});

test('formatCurrency: rechaza centavos no enteros (guarda de regresión de la ETAPA 1)', () => {
  assert.throws(() => formatCurrency(1.5));
});

// --- F. Contrato de nombres *_cents -----------------------------------------
//
// Se valida sobre las claves reales del dataset activo (no con una regex
// sobre el código fuente) para no duplicar la fuente de verdad ni depender
// de detalles de formato del archivo. Nombres en snake_case: son los DTO
// oficiales de WEB-09 (contrato único desde el cierre de Fase 0), no el
// contrato plano en camelCase que existía antes.

test('contrato: los campos monetarios activos usan sufijo _cents, no los nombres legacy en decimal', () => {
  const [payment] = paymentsDB;
  const [rate] = ratesDB;
  const [booking] = bookingsDB;
  const [product] = productsDB;

  assert.ok('amount_cents' in payment, 'Payment debe tener amount_cents');
  assert.ok(!('amount' in payment), 'Payment ya no debe tener amount decimal');
  assert.ok(!('amountCents' in payment), 'Payment ya no debe tener el nombre camelCase legacy');

  assert.ok('price_cents' in rate, 'Rate debe tener price_cents');
  assert.ok(!('price' in rate), 'Rate ya no debe tener price decimal');

  assert.ok('total_amount_cents' in booking, 'Booking debe tener total_amount_cents');
  assert.ok(!('totalAmount' in booking), 'Booking ya no debe tener totalAmount decimal');
  assert.ok(
    !('totalAmountCents' in booking),
    'Booking ya no debe tener el nombre camelCase legacy',
  );

  assert.ok('price_cents' in product, 'Product debe tener price_cents');
  assert.ok(!('price' in product), 'Product ya no debe tener price decimal');
});
