import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/shared/utils/date.ts'],
  outfile: '.cache/date.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  tsconfig: 'tsconfig.app.json',
});

const require = createRequire(import.meta.url);
delete require.cache[require.resolve('../.cache/date.cjs')];
const {
  formatDateGT,
  formatTimeGT,
  formatStayRange,
  calculateNights,
} = require('../.cache/date.cjs');

// --- formatDateGT -----------------------------------------------------

test('formatDateGT: 8 septiembre 2026 -> 08-09-2026', () => {
  assert.equal(formatDateGT(new Date(2026, 8, 8)), '08-09-2026');
});

test('formatDateGT: 1 enero 2026 -> 01-01-2026', () => {
  assert.equal(formatDateGT(new Date(2026, 0, 1)), '01-01-2026');
});

test('formatDateGT: 31 diciembre 2026 -> 31-12-2026', () => {
  assert.equal(formatDateGT(new Date(2026, 11, 31)), '31-12-2026');
});

test('formatDateGT: Date inválido -> lanza error', () => {
  assert.throws(() => formatDateGT(new Date(NaN)), /inválida/);
});

// --- formatTimeGT -------------------------------------------------------

test('formatTimeGT: 00:05', () => {
  assert.equal(formatTimeGT(new Date(2026, 8, 8, 0, 5)), '00:05');
});

test('formatTimeGT: 09:07', () => {
  assert.equal(formatTimeGT(new Date(2026, 8, 8, 9, 7)), '09:07');
});

test('formatTimeGT: 15:30', () => {
  assert.equal(formatTimeGT(new Date(2026, 8, 8, 15, 30)), '15:30');
});

test('formatTimeGT: 23:59', () => {
  assert.equal(formatTimeGT(new Date(2026, 8, 8, 23, 59)), '23:59');
});

test('formatTimeGT: Date inválido -> lanza error', () => {
  assert.throws(() => formatTimeGT(new Date(NaN)), /inválida/);
});

// --- formatStayRange ------------------------------------------------------

test('formatStayRange: 10 -> 15 septiembre 2026', () => {
  const checkIn = new Date(2026, 8, 10);
  const checkOut = new Date(2026, 8, 15);
  assert.equal(formatStayRange(checkIn, checkOut), '10-09-2026 – 15-09-2026');
});

test('formatStayRange: rango invertido -> lanza error', () => {
  const checkIn = new Date(2026, 8, 15);
  const checkOut = new Date(2026, 8, 10);
  assert.throws(() => formatStayRange(checkIn, checkOut), /inválido/);
});

test('formatStayRange: Date inválido -> lanza error', () => {
  const checkIn = new Date(2026, 8, 10);
  assert.throws(() => formatStayRange(checkIn, new Date(NaN)), /inválida/);
});

// --- calculateNights --------------------------------------------------

test('calculateNights: 10 -> 15 septiembre = 5', () => {
  const checkIn = new Date(2026, 8, 10);
  const checkOut = new Date(2026, 8, 15);
  assert.equal(calculateNights(checkIn, checkOut), 5);
});

test('calculateNights: mismo día = 0', () => {
  const day = new Date(2026, 8, 10);
  assert.equal(calculateNights(day, day), 0);
});

test('calculateNights: 30 septiembre -> 2 octubre = 2 (cruce de mes)', () => {
  const checkIn = new Date(2026, 8, 30);
  const checkOut = new Date(2026, 9, 2);
  assert.equal(calculateNights(checkIn, checkOut), 2);
});

test('calculateNights: 31 diciembre 2026 -> 2 enero 2027 = 2 (cruce de año)', () => {
  const checkIn = new Date(2026, 11, 31);
  const checkOut = new Date(2027, 0, 2);
  assert.equal(calculateNights(checkIn, checkOut), 2);
});

test('calculateNights: rango invertido -> lanza error, nunca negativo', () => {
  const checkIn = new Date(2026, 8, 15);
  const checkOut = new Date(2026, 8, 10);
  assert.throws(() => calculateNights(checkIn, checkOut), /inválido/);
});

test('calculateNights: Date inválido -> lanza error', () => {
  assert.throws(() => calculateNights(new Date(NaN), new Date(2026, 8, 10)), /inválida/);
});

// --- Días calendario, no diferencia cruda de milisegundos -----------------

test('calculateNights: usa días calendario, no la diferencia cruda en milisegundos', () => {
  // checkIn: 10 de septiembre, 23:30 local. checkOut: 11 de septiembre, 00:30
  // local. La diferencia real en tiempo de reloj es de apenas una hora
  // (3 600 000 ms), así que (checkOut.getTime() - checkIn.getTime()) /
  // 86 400 000 daría ~0.0417 noches: un resultado fraccionario y, para un
  // PMS, incorrecto. Como son dos días calendario distintos, el resultado
  // correcto es exactamente 1 noche.
  const checkIn = new Date(2026, 8, 10, 23, 30);
  const checkOut = new Date(2026, 8, 11, 0, 30);

  const rawMsDiffInDays = (checkOut.getTime() - checkIn.getTime()) / (24 * 60 * 60 * 1000);
  assert.notEqual(rawMsDiffInDays, 1, 'la diferencia cruda en ms no debería dar ya 1 por sí sola');

  assert.equal(calculateNights(checkIn, checkOut), 1);
});

test('calculateNights: siempre devuelve un entero exacto, sin importar la hora de cada fecha', () => {
  const checkIn = new Date(2026, 8, 10, 6, 45);
  const checkOut = new Date(2026, 8, 15, 19, 10);
  const nights = calculateNights(checkIn, checkOut);
  assert.equal(nights, 5);
  assert.ok(Number.isInteger(nights));
});
