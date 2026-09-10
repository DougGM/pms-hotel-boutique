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
  entryPoints: [
    'src/services/mockData.ts',
    'src/shared/mocks/lot-b.ts',
    'src/shared/mocks/lot-c.ts',
    'src/shared/mocks/lot-d.ts',
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
const { lotCMockData } = load('shared/mocks/lot-c');
const { lotDMockData } = load('shared/mocks/lot-d');

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
  // -- shared/mocks/lot-c.ts (WEB-11): cuentas, cargos, pagos, depósitos y
  // caja, construidos sobre las reservas/huéspedes reales del Lote B --
  {
    dataset: 'lot-c',
    label: 'guestAccount.booking_id -> lot-b.booking',
    records: lotCMockData.guestAccounts,
    field: 'booking_id',
    target: idsOf(lotBMockData.bookings),
  },
  {
    dataset: 'lot-c',
    label: 'guestAccount.guest_id -> lot-b.guest',
    records: lotCMockData.guestAccounts,
    field: 'guest_id',
    target: idsOf(lotBMockData.guests),
  },
  {
    dataset: 'lot-c',
    label: 'charge.booking_id -> lot-b.booking',
    records: lotCMockData.charges,
    field: 'booking_id',
    target: idsOf(lotBMockData.bookings),
  },
  {
    dataset: 'lot-c',
    label: 'charge.created_by_user_id -> lot-d.user',
    records: lotCMockData.charges,
    field: 'created_by_user_id',
    target: idsOf(lotDMockData.users),
    optional: true,
  },
  {
    dataset: 'lot-c',
    label: 'payment.booking_id -> lot-b.booking',
    records: lotCMockData.payments,
    field: 'booking_id',
    target: idsOf(lotBMockData.bookings),
  },
  {
    dataset: 'lot-c',
    label: 'payment.processed_by_user_id -> lot-d.user',
    records: lotCMockData.payments,
    field: 'processed_by_user_id',
    target: idsOf(lotDMockData.users),
    optional: true,
  },
  {
    dataset: 'lot-c',
    label: 'deposit.booking_id -> lot-b.booking',
    records: lotCMockData.deposits,
    field: 'booking_id',
    target: idsOf(lotBMockData.bookings),
  },
  {
    dataset: 'lot-c',
    label: 'deposit.guest_id -> lot-b.guest',
    records: lotCMockData.deposits,
    field: 'guest_id',
    target: idsOf(lotBMockData.guests),
  },
  {
    dataset: 'lot-c',
    label: 'cashSession.opened_by_user_id -> lot-d.user',
    records: lotCMockData.cashSessions,
    field: 'opened_by_user_id',
    target: idsOf(lotDMockData.users),
  },
  {
    dataset: 'lot-c',
    label: 'cashSession.closed_by_user_id -> lot-d.user',
    records: lotCMockData.cashSessions,
    field: 'closed_by_user_id',
    target: idsOf(lotDMockData.users),
    optional: true,
  },
  {
    dataset: 'lot-c',
    label: 'cashMovement.cash_session_id -> cashSession',
    records: lotCMockData.cashMovements,
    field: 'cash_session_id',
    target: idsOf(lotCMockData.cashSessions),
  },
  {
    dataset: 'lot-c',
    label: 'cashMovement.responsible_user_id -> lot-d.user',
    records: lotCMockData.cashMovements,
    field: 'responsible_user_id',
    target: idsOf(lotDMockData.users),
  },
  {
    dataset: 'lot-c',
    label: 'cashMovement.payment_id -> payment',
    records: lotCMockData.cashMovements,
    field: 'payment_id',
    target: idsOf(lotCMockData.payments),
    optional: true,
  },
  // -- shared/mocks/lot-d.ts (WEB-12): personal, catálogos e inventario --
  {
    dataset: 'lot-d',
    label: 'role.permission_ids -> permission',
    records: lotDMockData.roles,
    field: 'permission_ids',
    target: idsOf(lotDMockData.permissions),
    multi: true,
  },
  {
    dataset: 'lot-d',
    label: 'user.role -> role.code (correspondencia por valor, no FK — D-003)',
    records: lotDMockData.users,
    field: 'role',
    target: new Set(lotDMockData.roles.map((role) => role.code)),
  },
  {
    dataset: 'lot-d',
    label: 'inventoryMovement.inventory_item_id -> inventoryItem',
    records: lotDMockData.inventoryMovements,
    field: 'inventory_item_id',
    target: idsOf(lotDMockData.inventoryItems),
  },
  {
    dataset: 'lot-d',
    label: 'inventoryMovement.responsible_user_id -> user',
    records: lotDMockData.inventoryMovements,
    field: 'responsible_user_id',
    target: idsOf(lotDMockData.users),
  },
  {
    dataset: 'lot-d',
    label: 'auditLog.user_id -> user',
    records: lotDMockData.auditLogs,
    field: 'user_id',
    target: idsOf(lotDMockData.users),
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

// `product.inventory_consumption[].inventory_item_id -> inventoryItem`
// queda fuera de FK_CHECKS: no es un campo con un solo ID ni un array de
// IDs (`multi`), es un array de objetos `{ inventory_item_id, quantity }`
// (Lote D, WEB-12, ver docs/DECISIONES.md D-006).
test('integridad referencial (lot-d): product.inventory_consumption[].inventory_item_id -> inventoryItem', () => {
  const inventoryItemIds = idsOf(lotDMockData.inventoryItems);
  for (const product of lotDMockData.products) {
    for (const line of product.inventory_consumption ?? []) {
      assert.ok(
        inventoryItemIds.has(line.inventory_item_id),
        `${product.id}: inventory_consumption -> "${line.inventory_item_id}" no existe en inventoryItem`,
      );
    }
  }
});

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
  { dataset: 'lot-c', label: 'guestAccount', records: lotCMockData.guestAccounts },
  { dataset: 'lot-c', label: 'charge', records: lotCMockData.charges },
  { dataset: 'lot-c', label: 'payment', records: lotCMockData.payments },
  { dataset: 'lot-c', label: 'deposit', records: lotCMockData.deposits },
  { dataset: 'lot-c', label: 'cashSession', records: lotCMockData.cashSessions },
  { dataset: 'lot-c', label: 'cashMovement', records: lotCMockData.cashMovements },
  { dataset: 'lot-d', label: 'user', records: lotDMockData.users },
  { dataset: 'lot-d', label: 'role', records: lotDMockData.roles },
  { dataset: 'lot-d', label: 'permission', records: lotDMockData.permissions },
  { dataset: 'lot-d', label: 'amenity', records: lotDMockData.amenities },
  { dataset: 'lot-d', label: 'product', records: lotDMockData.products },
  { dataset: 'lot-d', label: 'inventoryItem', records: lotDMockData.inventoryItems },
  { dataset: 'lot-d', label: 'inventoryMovement', records: lotDMockData.inventoryMovements },
  { dataset: 'lot-d', label: 'auditLog', records: lotDMockData.auditLogs },
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
