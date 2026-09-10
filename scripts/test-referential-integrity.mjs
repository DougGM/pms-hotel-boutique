import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Verifica que TODA referencia entre entidades de los datasets resuelva —no
// solo room-type.room_feature_ids, que fue el hallazgo original (ver
// docs/DECISIONES.md, D-002)— y que ningún catálogo tenga IDs duplicados.

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/services/mockData.ts', 'src/shared/mocks/lot-b.ts'],
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
  mockAmenities,
  mockRoomFeatures,
  mockRoomTypes,
  mockRates,
  mockRooms,
  mockGuests,
  mockBookings,
  mockPayments,
  mockProducts,
} = load('services/mockData');
const { lotBMockData } = load('shared/mocks/lot-b');

const idsOf = (records) => new Set(records.map((record) => record.id));

// --- A. Ninguna referencia entre entidades queda colgando ---------------
//
// Cada entrada describe un campo FK: `records` es el dataset que lo tiene,
// `field` el nombre del campo, `target` el catálogo al que debe apuntar,
// `multi: true` si el campo es un array de IDs (en vez de un solo ID), y
// `optional: true` si el campo puede faltar en un registro dado.

const FK_CHECKS = [
  // -- services/mockData.ts --
  {
    dataset: 'mockData',
    label: 'roomType.room_feature_ids -> roomFeature',
    records: mockRoomTypes,
    field: 'room_feature_ids',
    target: idsOf(mockRoomFeatures),
    multi: true,
  },
  {
    dataset: 'mockData',
    label: 'room.room_type_id -> roomType',
    records: mockRooms,
    field: 'room_type_id',
    target: idsOf(mockRoomTypes),
  },
  {
    dataset: 'mockData',
    label: 'rate.room_type_id -> roomType',
    records: mockRates,
    field: 'room_type_id',
    target: idsOf(mockRoomTypes),
  },
  {
    dataset: 'mockData',
    label: 'booking.guest_id -> guest',
    records: mockBookings,
    field: 'guest_id',
    target: idsOf(mockGuests),
  },
  {
    dataset: 'mockData',
    label: 'booking.room_id -> room',
    records: mockBookings,
    field: 'room_id',
    target: idsOf(mockRooms),
    optional: true,
  },
  {
    dataset: 'mockData',
    label: 'booking.room_type_id -> roomType',
    records: mockBookings,
    field: 'room_type_id',
    target: idsOf(mockRoomTypes),
  },
  {
    dataset: 'mockData',
    label: 'booking.rate_id -> rate',
    records: mockBookings,
    field: 'rate_id',
    target: idsOf(mockRates),
    optional: true,
  },
  {
    dataset: 'mockData',
    label: 'payment.booking_id -> booking',
    records: mockPayments,
    field: 'booking_id',
    target: idsOf(mockBookings),
  },
  // -- shared/mocks/lot-b.ts --
  {
    dataset: 'lot-b',
    label: 'roomType.room_feature_ids -> roomFeature',
    records: lotBMockData.roomTypes,
    field: 'room_feature_ids',
    target: idsOf(lotBMockData.roomFeatures),
    multi: true,
  },
  {
    dataset: 'lot-b',
    label: 'room.room_type_id -> roomType',
    records: lotBMockData.rooms,
    field: 'room_type_id',
    target: idsOf(lotBMockData.roomTypes),
  },
  {
    dataset: 'lot-b',
    label: 'rate.room_type_id -> roomType',
    records: lotBMockData.rates,
    field: 'room_type_id',
    target: idsOf(lotBMockData.roomTypes),
  },
  {
    dataset: 'lot-b',
    label: 'booking.guest_id -> guest',
    records: lotBMockData.bookings,
    field: 'guest_id',
    target: idsOf(lotBMockData.guests),
  },
  {
    dataset: 'lot-b',
    label: 'booking.room_id -> room',
    records: lotBMockData.bookings,
    field: 'room_id',
    target: idsOf(lotBMockData.rooms),
    optional: true,
  },
  {
    dataset: 'lot-b',
    label: 'booking.room_type_id -> roomType',
    records: lotBMockData.bookings,
    field: 'room_type_id',
    target: idsOf(lotBMockData.roomTypes),
  },
  {
    dataset: 'lot-b',
    label: 'booking.rate_id -> rate',
    records: lotBMockData.bookings,
    field: 'rate_id',
    target: idsOf(lotBMockData.rates),
    optional: true,
  },
];

for (const check of FK_CHECKS) {
  test(`integridad referencial (${check.dataset}): ${check.label}`, () => {
    for (const record of check.records) {
      const value = record[check.field];
      if (value === undefined) {
        assert.ok(check.optional, `${record.id}: ${check.field} falta y no es opcional`);
        continue;
      }
      const values = check.multi ? value : [value];
      for (const target of values) {
        assert.ok(
          check.target.has(target),
          `${record.id}: ${check.field} -> "${target}" no existe en el catálogo destino`,
        );
      }
    }
  });
}

// --- B. Ningún catálogo tiene IDs duplicados -----------------------------

const CATALOGS = [
  { dataset: 'mockData', label: 'amenity', records: mockAmenities },
  { dataset: 'mockData', label: 'roomFeature', records: mockRoomFeatures },
  { dataset: 'mockData', label: 'roomType', records: mockRoomTypes },
  { dataset: 'mockData', label: 'rate', records: mockRates },
  { dataset: 'mockData', label: 'room', records: mockRooms },
  { dataset: 'mockData', label: 'guest', records: mockGuests },
  { dataset: 'mockData', label: 'booking', records: mockBookings },
  { dataset: 'mockData', label: 'payment', records: mockPayments },
  { dataset: 'mockData', label: 'product', records: mockProducts },
  { dataset: 'lot-b', label: 'roomFeature', records: lotBMockData.roomFeatures },
  { dataset: 'lot-b', label: 'roomType', records: lotBMockData.roomTypes },
  { dataset: 'lot-b', label: 'room', records: lotBMockData.rooms },
  { dataset: 'lot-b', label: 'guest', records: lotBMockData.guests },
  { dataset: 'lot-b', label: 'rate', records: lotBMockData.rates },
  { dataset: 'lot-b', label: 'booking', records: lotBMockData.bookings },
  { dataset: 'lot-b', label: 'promotion', records: lotBMockData.promotions },
];

for (const catalog of CATALOGS) {
  test(`sin IDs duplicados (${catalog.dataset}): ${catalog.label}`, () => {
    const ids = catalog.records.map((record) => record.id);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${catalog.label} (${catalog.dataset}) tiene IDs duplicados`,
    );
  });
}
