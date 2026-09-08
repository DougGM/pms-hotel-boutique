import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- A. Una sola definición por entidad ------------------------------------
//
// Antes de la FASE 3+4 del cierre de la Fase 0, booking/guest/payment/room/
// user (y catalog.ts, que duplicaba product y amenity) existían dos veces:
// un archivo plano en shared/types/entities/<x>.ts y la carpeta oficial
// shared/types/entities/<x>/. Esta prueba es la guarda de regresión: si
// alguien vuelve a crear un archivo plano junto a la carpeta, falla.

const ENTITIES_DIR = 'src/shared/types/entities';
const ENTITIES_WITH_FOLDER = [
  'amenity',
  'booking',
  'charge',
  'guest',
  'payment',
  'product',
  'promotion',
  'rate',
  'room',
  'room-type',
  'session',
  'user',
];

for (const entity of ENTITIES_WITH_FOLDER) {
  test(`contrato: ${entity} solo existe como carpeta (dto/model/mapper), no como archivo plano`, () => {
    assert.ok(
      existsSync(`${ENTITIES_DIR}/${entity}/${entity}.dto.ts`),
      `Falta ${ENTITIES_DIR}/${entity}/${entity}.dto.ts`,
    );
    assert.ok(
      !existsSync(`${ENTITIES_DIR}/${entity}.ts`),
      `${ENTITIES_DIR}/${entity}.ts no debería existir junto a la carpeta ${entity}/`,
    );
  });
}

test('contrato: no sobrevive el archivo plano catalog.ts (duplicaba product y amenity)', () => {
  assert.ok(!existsSync(`${ENTITIES_DIR}/catalog.ts`));
});

test('contrato: session/ y user/ existen por separado (sesión de PMS vs. rol de puesto)', () => {
  assert.ok(existsSync(`${ENTITIES_DIR}/session/session.dto.ts`));
  assert.ok(existsSync(`${ENTITIES_DIR}/user/user.dto.ts`));
});

// --- B. Campos de monto enteros en el dataset que sirven los servicios -----
//
// test-money-contract.mjs ya cubre mockData.ts (rates/bookings/payments/
// products) a fondo, incluida la trampa de centavos. Esta sección cubre el
// dataset que roomService/guestService/bookingService realmente sirven desde
// la FASE 5: shared/mocks/lot-b.ts.

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/shared/mocks/lot-b.ts'],
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
const { lotBMockData } = require(require.resolve('../.cache/shared/mocks/lot-b.cjs'));

test('lot-b: rates.price_cents es entero y currency es GTQ en cada registro', () => {
  assert.ok(lotBMockData.rates.length > 0);
  for (const rate of lotBMockData.rates) {
    assert.ok(Number.isInteger(rate.price_cents), `rate ${rate.id}: price_cents no es entero`);
    assert.equal(rate.currency, 'GTQ', `rate ${rate.id}: currency no es GTQ`);
  }
});

test('lot-b: bookings.total_amount_cents es entero y currency es GTQ en cada registro', () => {
  assert.ok(lotBMockData.bookings.length > 0);
  for (const booking of lotBMockData.bookings) {
    assert.ok(
      Number.isInteger(booking.total_amount_cents),
      `booking ${booking.id}: total_amount_cents no es entero`,
    );
    assert.equal(booking.currency, 'GTQ', `booking ${booking.id}: currency no es GTQ`);
  }
});

test('lot-b: ningún registro de rates/bookings usa un nombre de campo en camelCase legacy', () => {
  for (const rate of lotBMockData.rates) {
    assert.ok(!('priceCents' in rate), `rate ${rate.id} usa priceCents en vez de price_cents`);
  }
  for (const booking of lotBMockData.bookings) {
    assert.ok(
      !('totalAmountCents' in booking),
      `booking ${booking.id} usa totalAmountCents en vez de total_amount_cents`,
    );
  }
});
