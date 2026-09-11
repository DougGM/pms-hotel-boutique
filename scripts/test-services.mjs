import { build } from 'esbuild';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- A. Regla de oro, verificacion estatica --------------------------------
//
// Ningun archivo fuera de src/services/ debe importar de src/data/: todo
// acceso a datos simulados pasa por un servicio.

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'services') continue; // los servicios sí pueden importar src/data/
      files.push(...(await collectSourceFiles(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

test('regla de oro: ningún archivo fuera de services/ importa de src/data/', async () => {
  const files = await collectSourceFiles('src');
  const offenders = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    if (/from ['"][^'"]*\bdata\/db\b/.test(content)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Archivos fuera de services/ que importan src/data/: ${offenders.join(', ')}`,
  );
});

// --- B. Contrato de servicio: async, latencia simulada, Model no DTO -------
//
// Se prueban los diez servicios CRUD de WEB-05/WEB-11/WEB-12 (booking/room/
// guest/payment/catalog/guestAccount/cash/personnel/inventory/audit).
// authService no se repite aquí: sus 14 pruebas en test-auth.mjs ya cubren
// async, latencia, forma de Model y forzado de error a fondo.

await mkdir('.cache', { recursive: true });
await build({
  stdin: {
    contents: `
      export { bookingService } from './src/services/bookingService';
      export { roomService } from './src/services/roomService';
      export { guestService } from './src/services/guestService';
      export { paymentService } from './src/services/paymentService';
      export { catalogService } from './src/services/catalogService';
      export { guestAccountService } from './src/services/guestAccountService';
      export { cashService } from './src/services/cashService';
      export { personnelService } from './src/services/personnelService';
      export { inventoryService } from './src/services/inventoryService';
      export { auditService } from './src/services/auditService';
      export { mockUtils } from './src/services/mockUtils';
    `,
    resolveDir: '.',
    loader: 'ts',
  },
  outfile: '.cache/services-harness.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  tsconfig: 'tsconfig.app.json',
});

const require = createRequire(import.meta.url);
const {
  bookingService,
  roomService,
  guestService,
  paymentService,
  catalogService,
  guestAccountService,
  cashService,
  personnelService,
  inventoryService,
  auditService,
  mockUtils,
} = require(require.resolve('../.cache/services-harness.cjs'));

const MIN_LATENCY_MS = 250; // 300ms nominal, con margen por scheduling
const MAX_LATENCY_MS = 900; // 600ms nominal, con margen para CI lento

async function assertServiceCall(label, call) {
  const started = Date.now();
  const result = call();
  assert.ok(result instanceof Promise, `${label}: debe devolver una Promise (ser async)`);
  const value = await result;
  const elapsed = Date.now() - started;
  assert.ok(
    elapsed >= MIN_LATENCY_MS && elapsed <= MAX_LATENCY_MS,
    `${label}: la latencia simulada fue ${elapsed}ms, se esperaba entre ${MIN_LATENCY_MS} y ${MAX_LATENCY_MS}ms`,
  );
  return value;
}

test('bookingService.getBookings: async, con latencia simulada, devuelve Models (no DTOs)', async () => {
  const bookings = await assertServiceCall('bookingService.getBookings', () =>
    bookingService.getBookings(),
  );
  assert.ok(Array.isArray(bookings) && bookings.length > 0);
  const [booking] = bookings;
  assert.ok('roomTypeId' in booking, 'el Model de Booking debe tener roomTypeId (camelCase)');
  assert.ok(!('room_type_id' in booking), 'un Model no debe traer campos snake_case del DTO');
  assert.ok(booking.checkIn instanceof Date, 'checkIn debe ser un Date de dominio, no un string');
});

test('roomService.getRooms: async, con latencia simulada, devuelve Models (no DTOs)', async () => {
  const rooms = await assertServiceCall('roomService.getRooms', () => roomService.getRooms());
  assert.ok(Array.isArray(rooms) && rooms.length > 0);
  const [room] = rooms;
  assert.ok('roomNumber' in room, 'el Model de Room debe tener roomNumber (camelCase)');
  assert.ok(!('room_number' in room), 'un Model no debe traer campos snake_case del DTO');
});

test('guestService.getGuests: async, con latencia simulada, devuelve Models (no DTOs)', async () => {
  const guests = await assertServiceCall('guestService.getGuests', () => guestService.getGuests());
  assert.ok(Array.isArray(guests) && guests.length > 0);
  const [guest] = guests;
  assert.ok('firstName' in guest, 'el Model de Guest debe tener firstName (camelCase)');
  assert.ok(!('first_name' in guest), 'un Model no debe traer campos snake_case del DTO');
});

test('paymentService.getPaymentsByBookingId: async, con latencia simulada, devuelve Models', async () => {
  const payments = await assertServiceCall('paymentService.getPaymentsByBookingId', () =>
    paymentService.getPaymentsByBookingId('BKG-003'),
  );
  assert.ok(Array.isArray(payments) && payments.length > 0);
  assert.ok('amountCents' in payments[0], 'el Model de Payment debe tener amountCents');
  assert.ok(!('amount_cents' in payments[0]), 'un Model no debe traer campos snake_case del DTO');
});

test('catalogService.getProducts/getAmenities: async, con latencia simulada, devuelven Models', async () => {
  const products = await assertServiceCall('catalogService.getProducts', () =>
    catalogService.getProducts(),
  );
  assert.ok(Array.isArray(products) && products.length > 0);
  assert.ok('priceCents' in products[0], 'el Model de Product debe tener priceCents');
  assert.ok(!('price_cents' in products[0]), 'un Model no debe traer campos snake_case del DTO');

  const amenities = await assertServiceCall('catalogService.getAmenities', () =>
    catalogService.getAmenities(),
  );
  assert.ok(Array.isArray(amenities) && amenities.length > 0);
});

test('guestAccountService.getAccounts: async, con latencia simulada, devuelve Models', async () => {
  const accounts = await assertServiceCall('guestAccountService.getAccounts', () =>
    guestAccountService.getAccounts(),
  );
  assert.ok(Array.isArray(accounts) && accounts.length > 0);
  assert.ok('balanceCents' in accounts[0], 'el Model de GuestAccount debe tener balanceCents');
  assert.ok(!('balance_cents' in accounts[0]), 'un Model no debe traer campos snake_case del DTO');
});

test('cashService.getSessions: async, con latencia simulada, devuelve Models', async () => {
  const sessions = await assertServiceCall('cashService.getSessions', () =>
    cashService.getSessions(),
  );
  assert.ok(Array.isArray(sessions) && sessions.length > 0);
  assert.ok(
    'openingBalanceCents' in sessions[0],
    'el Model de CashSession debe tener openingBalanceCents',
  );
});

test('personnelService.getUsers/getRoles/getPermissions: async, con latencia simulada, devuelven Models', async () => {
  const users = await assertServiceCall('personnelService.getUsers', () =>
    personnelService.getUsers(),
  );
  assert.ok(Array.isArray(users) && users.length > 0);
  assert.ok('firstName' in users[0], 'el Model de User debe tener firstName (camelCase)');

  const roles = await assertServiceCall('personnelService.getRoles', () =>
    personnelService.getRoles(),
  );
  assert.ok(Array.isArray(roles) && roles.length > 0);

  const permissions = await assertServiceCall('personnelService.getPermissions', () =>
    personnelService.getPermissions(),
  );
  assert.ok(Array.isArray(permissions) && permissions.length > 0);
});

test('inventoryService.getItems: async, con latencia simulada, devuelve Models', async () => {
  const items = await assertServiceCall('inventoryService.getItems', () =>
    inventoryService.getItems(),
  );
  assert.ok(Array.isArray(items) && items.length > 0);
  assert.ok(
    'currentQuantity' in items[0],
    'el Model de InventoryItem debe tener currentQuantity (camelCase)',
  );
});

test('auditService.getLogs: async, con latencia simulada, devuelve Models', async () => {
  const logs = await assertServiceCall('auditService.getLogs', () => auditService.getLogs());
  assert.ok(Array.isArray(logs) && logs.length > 0);
  assert.ok('occurredAt' in logs[0], 'el Model de AuditLog debe tener occurredAt (camelCase)');
});

// --- C. Mecanismo de error forzado ------------------------------------------

test('mockUtils.setForceError: hace que los servicios rechacen, y se puede desactivar', async () => {
  mockUtils.setForceError(true);
  await assert.rejects(() => bookingService.getBookings());
  await assert.rejects(() => roomService.getRooms());
  mockUtils.setForceError(false);
  await assert.doesNotReject(() => bookingService.getBookings());
});
