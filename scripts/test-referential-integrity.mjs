import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Verifica que TODA referencia entre entidades del dataset resuelva —no solo
// room-type.room_feature_ids, que fue el hallazgo original (ver
// docs/DECISIONES.md, D-002)— y que ningún catálogo tenga IDs duplicados.
// Desde la consolidación en src/data/db.ts hay un solo dataset por entidad
// (antes había dos mundos paralelos, mockData.ts y los lotes, con IDs que no
// se cruzaban entre sí).

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['src/data/db.ts'],
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
  roomFeaturesDB,
  roomTypesDB,
  roomsDB,
  guestsDB,
  ratesDB,
  bookingsDB,
  promotionsDB,
  guestAccountsDB,
  chargesDB,
  paymentsDB,
  depositsDB,
  cashSessionsDB,
  cashMovementsDB,
  usersDB,
  rolesDB,
  permissionsDB,
  amenitiesDB,
  productsDB,
  inventoryItemsDB,
  inventoryMovementsDB,
  auditLogsDB,
  ordersDB,
  serviceRequestsDB,
} = load('data/db');

const idsOf = (records) => new Set(records.map((record) => record.id));

// --- A. Ninguna referencia entre entidades queda colgando ---------------
//
// Cada entrada describe un campo FK: `records` es el dataset que lo tiene,
// `field` el nombre del campo, `target` el catálogo al que debe apuntar,
// `multi: true` si el campo es un array de IDs (en vez de un solo ID), y
// `optional: true` si el campo puede faltar en un registro dado.

const FK_CHECKS = [
  {
    label: 'roomType.room_feature_ids -> roomFeature',
    records: roomTypesDB,
    field: 'room_feature_ids',
    target: idsOf(roomFeaturesDB),
    multi: true,
  },
  {
    label: 'room.room_type_id -> roomType',
    records: roomsDB,
    field: 'room_type_id',
    target: idsOf(roomTypesDB),
  },
  {
    label: 'rate.room_type_id -> roomType',
    records: ratesDB,
    field: 'room_type_id',
    target: idsOf(roomTypesDB),
  },
  {
    label: 'booking.guest_id -> guest',
    records: bookingsDB,
    field: 'guest_id',
    target: idsOf(guestsDB),
  },
  {
    label: 'booking.room_id -> room',
    records: bookingsDB,
    field: 'room_id',
    target: idsOf(roomsDB),
    optional: true,
  },
  {
    label: 'booking.room_type_id -> roomType',
    records: bookingsDB,
    field: 'room_type_id',
    target: idsOf(roomTypesDB),
  },
  {
    label: 'booking.rate_id -> rate',
    records: bookingsDB,
    field: 'rate_id',
    target: idsOf(ratesDB),
    optional: true,
  },
  // -- Lote C (WEB-11): cuentas, cargos, pagos, depósitos y caja --
  {
    label: 'guestAccount.booking_id -> booking',
    records: guestAccountsDB,
    field: 'booking_id',
    target: idsOf(bookingsDB),
  },
  {
    label: 'guestAccount.guest_id -> guest',
    records: guestAccountsDB,
    field: 'guest_id',
    target: idsOf(guestsDB),
  },
  {
    label: 'charge.booking_id -> booking',
    records: chargesDB,
    field: 'booking_id',
    target: idsOf(bookingsDB),
  },
  {
    label: 'charge.created_by_user_id -> user',
    records: chargesDB,
    field: 'created_by_user_id',
    target: idsOf(usersDB),
    optional: true,
  },
  {
    label: 'payment.booking_id -> booking',
    records: paymentsDB,
    field: 'booking_id',
    target: idsOf(bookingsDB),
  },
  {
    label: 'payment.processed_by_user_id -> user',
    records: paymentsDB,
    field: 'processed_by_user_id',
    target: idsOf(usersDB),
    optional: true,
  },
  {
    label: 'deposit.booking_id -> booking',
    records: depositsDB,
    field: 'booking_id',
    target: idsOf(bookingsDB),
  },
  {
    label: 'deposit.guest_id -> guest',
    records: depositsDB,
    field: 'guest_id',
    target: idsOf(guestsDB),
  },
  {
    label: 'cashSession.opened_by_user_id -> user',
    records: cashSessionsDB,
    field: 'opened_by_user_id',
    target: idsOf(usersDB),
  },
  {
    label: 'cashSession.closed_by_user_id -> user',
    records: cashSessionsDB,
    field: 'closed_by_user_id',
    target: idsOf(usersDB),
    optional: true,
  },
  {
    label: 'cashMovement.cash_session_id -> cashSession',
    records: cashMovementsDB,
    field: 'cash_session_id',
    target: idsOf(cashSessionsDB),
  },
  {
    label: 'cashMovement.responsible_user_id -> user',
    records: cashMovementsDB,
    field: 'responsible_user_id',
    target: idsOf(usersDB),
  },
  {
    label: 'cashMovement.payment_id -> payment',
    records: cashMovementsDB,
    field: 'payment_id',
    target: idsOf(paymentsDB),
    optional: true,
  },
  // -- Lote D (WEB-12): personal, catálogos e inventario --
  {
    label: 'role.permission_ids -> permission',
    records: rolesDB,
    field: 'permission_ids',
    target: idsOf(permissionsDB),
    multi: true,
  },
  {
    label: 'user.role -> role.code (correspondencia por valor, no FK — D-003)',
    records: usersDB,
    field: 'role',
    target: new Set(rolesDB.map((role) => role.code)),
  },
  {
    label: 'inventoryItem.product_id -> product',
    records: inventoryItemsDB,
    field: 'product_id',
    target: idsOf(productsDB),
    optional: true,
  },
  {
    label: 'inventoryMovement.inventory_item_id -> inventoryItem',
    records: inventoryMovementsDB,
    field: 'inventory_item_id',
    target: idsOf(inventoryItemsDB),
  },
  {
    label: 'inventoryMovement.responsible_user_id -> user',
    records: inventoryMovementsDB,
    field: 'responsible_user_id',
    target: idsOf(usersDB),
  },
  {
    label: 'auditLog.user_id -> user',
    records: auditLogsDB,
    field: 'user_id',
    target: idsOf(usersDB),
  },
  // -- order y service_request: construidos sobre estadías reales del Lote B --
  {
    label: 'order.booking_id -> booking',
    records: ordersDB,
    field: 'booking_id',
    target: idsOf(bookingsDB),
  },
  {
    label: 'order.room_id -> room',
    records: ordersDB,
    field: 'room_id',
    target: idsOf(roomsDB),
  },
  {
    label: 'order.guest_id -> guest',
    records: ordersDB,
    field: 'guest_id',
    target: idsOf(guestsDB),
    optional: true,
  },
  {
    label: 'serviceRequest.booking_id -> booking',
    records: serviceRequestsDB,
    field: 'booking_id',
    target: idsOf(bookingsDB),
  },
  {
    label: 'serviceRequest.room_id -> room',
    records: serviceRequestsDB,
    field: 'room_id',
    target: idsOf(roomsDB),
  },
  {
    label: 'serviceRequest.guest_id -> guest',
    records: serviceRequestsDB,
    field: 'guest_id',
    target: idsOf(guestsDB),
    optional: true,
  },
];

for (const check of FK_CHECKS) {
  test(`integridad referencial: ${check.label}`, () => {
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

// --- B. order.items[].product_id -> product (array de objetos, no de IDs) --
//
// No encaja en el arnés genérico de arriba (multi/optional trabajan sobre
// arrays de IDs sueltos, no de objetos) — prueba dedicada, mismo criterio
// que product.inventory_consumption en la adenda del PR #36.

test('integridad referencial: order.items[].product_id -> product', () => {
  const productIds = idsOf(productsDB);
  for (const order of ordersDB) {
    for (const item of order.items) {
      assert.ok(
        productIds.has(item.product_id),
        `${order.id}: items[].product_id -> "${item.product_id}" no existe en el catálogo de productos`,
      );
    }
  }
});

// --- C. Ningún catálogo tiene IDs duplicados -----------------------------

const CATALOGS = [
  { label: 'roomFeature', records: roomFeaturesDB },
  { label: 'roomType', records: roomTypesDB },
  { label: 'room', records: roomsDB },
  { label: 'guest', records: guestsDB },
  { label: 'rate', records: ratesDB },
  { label: 'booking', records: bookingsDB },
  { label: 'promotion', records: promotionsDB },
  { label: 'guestAccount', records: guestAccountsDB },
  { label: 'charge', records: chargesDB },
  { label: 'payment', records: paymentsDB },
  { label: 'deposit', records: depositsDB },
  { label: 'cashSession', records: cashSessionsDB },
  { label: 'cashMovement', records: cashMovementsDB },
  { label: 'user', records: usersDB },
  { label: 'role', records: rolesDB },
  { label: 'permission', records: permissionsDB },
  { label: 'amenity', records: amenitiesDB },
  { label: 'product', records: productsDB },
  { label: 'inventoryItem', records: inventoryItemsDB },
  { label: 'inventoryMovement', records: inventoryMovementsDB },
  { label: 'auditLog', records: auditLogsDB },
  { label: 'order', records: ordersDB },
  { label: 'serviceRequest', records: serviceRequestsDB },
];

for (const catalog of CATALOGS) {
  test(`sin IDs duplicados: ${catalog.label}`, () => {
    const ids = catalog.records.map((record) => record.id);
    assert.equal(new Set(ids).size, ids.length, `${catalog.label} tiene IDs duplicados`);
  });
}
