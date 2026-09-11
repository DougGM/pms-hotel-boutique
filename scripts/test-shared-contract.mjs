import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Suite del contrato compartido (docs/CONTRATO-DATOS.md): fechas ISO
// válidas, montos en centavos enteros, literales de estado dentro de
// shared/constants/statuses.ts, código de vinculación de reserva único, y
// mappers DTO -> Model sin pérdida de campos. Desde la consolidación en
// src/data/db.ts hay un solo dataset por entidad (antes había dos mundos
// paralelos, mockData.ts y los lotes, con IDs que no se cruzaban entre sí).

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: [
    'src/data/db.ts',
    'src/shared/constants/statuses.ts',
    'src/shared/types/entities/amenity/index.ts',
    'src/shared/types/entities/audit-log/index.ts',
    'src/shared/types/entities/booking/index.ts',
    'src/shared/types/entities/cash-movement/index.ts',
    'src/shared/types/entities/cash-session/index.ts',
    'src/shared/types/entities/charge/index.ts',
    'src/shared/types/entities/deposit/index.ts',
    'src/shared/types/entities/guest/index.ts',
    'src/shared/types/entities/guest-account/index.ts',
    'src/shared/types/entities/inventory-item/index.ts',
    'src/shared/types/entities/inventory-movement/index.ts',
    'src/shared/types/entities/order/index.ts',
    'src/shared/types/entities/payment/index.ts',
    'src/shared/types/entities/permission/index.ts',
    'src/shared/types/entities/product/index.ts',
    'src/shared/types/entities/promotion/index.ts',
    'src/shared/types/entities/rate/index.ts',
    'src/shared/types/entities/role/index.ts',
    'src/shared/types/entities/room/index.ts',
    'src/shared/types/entities/room-feature/index.ts',
    'src/shared/types/entities/room-type/index.ts',
    'src/shared/types/entities/service-request/index.ts',
    'src/shared/types/entities/user/index.ts',
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
  amenitiesDB,
  roomFeaturesDB,
  roomTypesDB,
  ratesDB,
  roomsDB,
  guestsDB,
  bookingsDB,
  paymentsDB,
  productsDB,
  promotionsDB,
  guestAccountsDB,
  chargesDB,
  depositsDB,
  cashSessionsDB,
  cashMovementsDB,
  usersDB,
  rolesDB,
  permissionsDB,
  inventoryItemsDB,
  inventoryMovementsDB,
  auditLogsDB,
  ordersDB,
  serviceRequestsDB,
} = load('data/db');
const { ROOM_STATUSES, BOOKING_STATUSES, ORDER_STATUSES, SERVICE_REQUEST_STATUSES } = load(
  'shared/constants/statuses',
);
const amenityMapper = load('shared/types/entities/amenity/index');
const auditLogMapper = load('shared/types/entities/audit-log/index');
const bookingMapper = load('shared/types/entities/booking/index');
const cashMovementMapper = load('shared/types/entities/cash-movement/index');
const cashSessionMapper = load('shared/types/entities/cash-session/index');
const chargeMapper = load('shared/types/entities/charge/index');
const depositMapper = load('shared/types/entities/deposit/index');
const guestMapper = load('shared/types/entities/guest/index');
const guestAccountMapper = load('shared/types/entities/guest-account/index');
const inventoryItemMapper = load('shared/types/entities/inventory-item/index');
const inventoryMovementMapper = load('shared/types/entities/inventory-movement/index');
const orderMapper = load('shared/types/entities/order/index');
const paymentMapper = load('shared/types/entities/payment/index');
const permissionMapper = load('shared/types/entities/permission/index');
const productMapper = load('shared/types/entities/product/index');
const promotionMapper = load('shared/types/entities/promotion/index');
const rateMapper = load('shared/types/entities/rate/index');
const roleMapper = load('shared/types/entities/role/index');
const roomMapper = load('shared/types/entities/room/index');
const roomFeatureMapper = load('shared/types/entities/room-feature/index');
const roomTypeMapper = load('shared/types/entities/room-type/index');
const serviceRequestMapper = load('shared/types/entities/service-request/index');
const userMapper = load('shared/types/entities/user/index');

const stripUndefined = (value) => {
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) out[key] = val;
  }
  return out;
};

const assertRoundTrip = (label, dto, mapper) => {
  const model = mapper.toDomain(dto);
  const roundTripped = mapper.toDTO(model);
  assert.deepStrictEqual(
    stripUndefined(roundTripped),
    stripUndefined(dto),
    `${label}: el mapper perdió o alteró campos en el ciclo DTO -> Model -> DTO`,
  );
};

// --- A. Fechas ISO 8601 válidas ---------------------------------------

const TIMESTAMP_FIELDS = [
  'created_at',
  'updated_at',
  'charged_at',
  'paid_at',
  'requested_at',
  'opened_at',
  'closed_at',
  'collected_at',
  'refunded_at',
  'occurred_at',
];
const CALENDAR_FIELDS = ['check_in', 'check_out', 'valid_from', 'valid_to'];

function collectDatasets() {
  return [
    ...amenitiesDB,
    ...roomFeaturesDB,
    ...roomTypesDB,
    ...ratesDB,
    ...roomsDB,
    ...guestsDB,
    ...bookingsDB,
    ...paymentsDB,
    ...productsDB,
    ...promotionsDB,
    ...guestAccountsDB,
    ...chargesDB,
    ...depositsDB,
    ...cashSessionsDB,
    ...cashMovementsDB,
    ...usersDB,
    ...rolesDB,
    ...permissionsDB,
    ...inventoryItemsDB,
    ...inventoryMovementsDB,
    ...auditLogsDB,
    ...ordersDB,
    ...serviceRequestsDB,
  ];
}

test('DTO: todo campo de timestamp parsea como ISO 8601 válido', () => {
  for (const record of collectDatasets()) {
    for (const field of TIMESTAMP_FIELDS) {
      if (record[field] === undefined) continue;
      const parsed = new Date(record[field]);
      assert.ok(
        !Number.isNaN(parsed.getTime()),
        `${record.id ?? '(sin id)'}: ${field}="${record[field]}" no es una fecha ISO válida`,
      );
    }
  }
});

test('DTO: todo campo de fecha civil usa "YYYY-MM-DD", ninguno usa dd-mm-aaaa', () => {
  const CALENDAR_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const LEGACY_DDMMYYYY = /^\d{2}-\d{2}-\d{4}$/;
  for (const record of collectDatasets()) {
    for (const field of CALENDAR_FIELDS) {
      if (record[field] === undefined) continue;
      assert.ok(
        CALENDAR_PATTERN.test(record[field]),
        `${record.id ?? '(sin id)'}: ${field}="${record[field]}" no tiene forma YYYY-MM-DD`,
      );
      assert.ok(
        !LEGACY_DDMMYYYY.test(record[field]),
        `${record.id ?? '(sin id)'}: ${field}="${record[field]}" quedó en formato de presentación dd-mm-aaaa`,
      );
    }
  }
});

// --- B. Montos en centavos enteros ------------------------------------

test('DTO: todo campo que termina en _cents es un entero', () => {
  for (const record of collectDatasets()) {
    for (const [key, value] of Object.entries(record)) {
      if (key.endsWith('_cents')) {
        assert.ok(
          Number.isInteger(value),
          `${record.id ?? '(sin id)'}: ${key}=${value} no es entero`,
        );
      }
    }
  }
});

// --- C. Literales de estado dentro del contrato compartido ------------

test('room: el status de cada registro pertenece a ROOM_STATUSES', () => {
  for (const room of roomsDB) {
    const { status } = roomMapper.toDomain(room);
    assert.ok(
      ROOM_STATUSES.includes(status),
      `room ${room.id}: status "${status}" no está en ROOM_STATUSES`,
    );
  }
});

test('booking: el status de cada registro pertenece a BOOKING_STATUSES', () => {
  for (const booking of bookingsDB) {
    const { status } = bookingMapper.toDomain(booking);
    assert.ok(
      BOOKING_STATUSES.includes(status),
      `booking ${booking.id}: status "${status}" no está en BOOKING_STATUSES`,
    );
  }
});

test('order: ORDER_STATUSES coincide con los literales del plan MOV-04', () => {
  assert.deepStrictEqual(ORDER_STATUSES, [
    'pending',
    'accepted',
    'preparing',
    'ready',
    'onTheWay',
    'delivered',
    'rejected',
    'cancelled',
  ]);
});

test('order: el status de cada registro pertenece a ORDER_STATUSES', () => {
  for (const order of ordersDB) {
    const { status } = orderMapper.toDomain(order);
    assert.ok(
      ORDER_STATUSES.includes(status),
      `order ${order.id}: status "${status}" no está en ORDER_STATUSES`,
    );
  }
});

test('service_request: SERVICE_REQUEST_STATUSES coincide con los literales del plan MOV-04', () => {
  assert.deepStrictEqual(SERVICE_REQUEST_STATUSES, [
    'pending',
    'accepted',
    'inProgress',
    'completed',
    'rejected',
  ]);
});

test('service_request: el status de cada registro pertenece a SERVICE_REQUEST_STATUSES', () => {
  for (const serviceRequest of serviceRequestsDB) {
    const { status } = serviceRequestMapper.toDomain(serviceRequest);
    assert.ok(
      SERVICE_REQUEST_STATUSES.includes(status),
      `service_request ${serviceRequest.id}: status "${status}" no está en SERVICE_REQUEST_STATUSES`,
    );
  }
});

// --- D. Código de vinculación de reserva --------------------------------

test('booking: todo registro tiene guest_link_code', () => {
  for (const booking of bookingsDB) {
    assert.ok(
      typeof booking.guest_link_code === 'string' && booking.guest_link_code.length > 0,
      `booking ${booking.id}: falta guest_link_code`,
    );
  }
});

test('booking: guest_link_code es único en todo el dataset', () => {
  const codes = bookingsDB.map((booking) => booking.guest_link_code);
  assert.equal(new Set(codes).size, codes.length, 'hay guest_link_code repetidos en bookingsDB');
});

// --- E. Mappers DTO -> Model -> DTO sin pérdida de campos --------------

test('mapper amenity: round-trip sin pérdida', () => {
  for (const dto of amenitiesDB) assertRoundTrip(`amenity ${dto.id}`, dto, amenityMapper);
});

test('mapper booking: round-trip sin pérdida', () => {
  for (const dto of bookingsDB) assertRoundTrip(`booking ${dto.id}`, dto, bookingMapper);
});

test('mapper guest: round-trip sin pérdida', () => {
  for (const dto of guestsDB) assertRoundTrip(`guest ${dto.id}`, dto, guestMapper);
});

test('mapper payment: round-trip sin pérdida', () => {
  for (const dto of paymentsDB) assertRoundTrip(`payment ${dto.id}`, dto, paymentMapper);
});

test('mapper product (25 productos): round-trip sin pérdida', () => {
  for (const dto of productsDB) assertRoundTrip(`product ${dto.id}`, dto, productMapper);
});

test('mapper promotion: round-trip sin pérdida', () => {
  for (const dto of promotionsDB) {
    assertRoundTrip(`promotion ${dto.id}`, dto, promotionMapper);
  }
});

test('mapper rate: round-trip sin pérdida', () => {
  for (const dto of ratesDB) assertRoundTrip(`rate ${dto.id}`, dto, rateMapper);
});

test('mapper room: round-trip sin pérdida', () => {
  for (const dto of roomsDB) assertRoundTrip(`room ${dto.id}`, dto, roomMapper);
});

test('mapper room-feature: round-trip sin pérdida', () => {
  for (const dto of roomFeaturesDB) {
    assertRoundTrip(`room-feature ${dto.id}`, dto, roomFeatureMapper);
  }
});

test('mapper room-type: round-trip sin pérdida', () => {
  for (const dto of roomTypesDB) assertRoundTrip(`room-type ${dto.id}`, dto, roomTypeMapper);
});

test('mapper charge: round-trip sin pérdida', () => {
  for (const dto of chargesDB) assertRoundTrip(`charge ${dto.id}`, dto, chargeMapper);
});

test('mapper user: round-trip sin pérdida', () => {
  for (const dto of usersDB) assertRoundTrip(`user ${dto.id}`, dto, userMapper);
});

test('mapper order: round-trip sin pérdida', () => {
  for (const dto of ordersDB) assertRoundTrip(`order ${dto.id}`, dto, orderMapper);
});

test('mapper service_request: round-trip sin pérdida', () => {
  for (const dto of serviceRequestsDB) {
    assertRoundTrip(`service_request ${dto.id}`, dto, serviceRequestMapper);
  }
});

test('mapper guest-account: round-trip sin pérdida', () => {
  for (const dto of guestAccountsDB) {
    assertRoundTrip(`guest-account ${dto.id}`, dto, guestAccountMapper);
  }
});

test('mapper deposit: round-trip sin pérdida', () => {
  for (const dto of depositsDB) assertRoundTrip(`deposit ${dto.id}`, dto, depositMapper);
});

test('mapper cash-session: round-trip sin pérdida', () => {
  for (const dto of cashSessionsDB) {
    assertRoundTrip(`cash-session ${dto.id}`, dto, cashSessionMapper);
  }
});

test('mapper cash-movement: round-trip sin pérdida', () => {
  for (const dto of cashMovementsDB) {
    assertRoundTrip(`cash-movement ${dto.id}`, dto, cashMovementMapper);
  }
});

test('mapper role: round-trip sin pérdida', () => {
  for (const dto of rolesDB) assertRoundTrip(`role ${dto.id}`, dto, roleMapper);
});

test('mapper permission: round-trip sin pérdida', () => {
  for (const dto of permissionsDB) {
    assertRoundTrip(`permission ${dto.id}`, dto, permissionMapper);
  }
});

test('mapper inventory-item: round-trip sin pérdida', () => {
  for (const dto of inventoryItemsDB) {
    assertRoundTrip(`inventory-item ${dto.id}`, dto, inventoryItemMapper);
  }
});

test('mapper inventory-movement: round-trip sin pérdida', () => {
  for (const dto of inventoryMovementsDB) {
    assertRoundTrip(`inventory-movement ${dto.id}`, dto, inventoryMovementMapper);
  }
});

test('mapper audit-log: round-trip sin pérdida', () => {
  for (const dto of auditLogsDB) assertRoundTrip(`audit-log ${dto.id}`, dto, auditLogMapper);
});
