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
      export { bookingCompanionService } from './src/services/bookingCompanionService';
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
  bookingCompanionService,
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

// --- D. WEB-14: servicios faltantes para la vertical Ronda 1 ---------------

test('roomService.createRoom/updateRoom/getRoomTypes: escriben roomsDB y devuelven Models', async () => {
  const room = await assertServiceCall('roomService.createRoom', () =>
    roomService.createRoom({
      room_number: '909',
      room_type_id: 'RT-01',
      floor: 9,
      notes: 'Habitación creada por prueba WEB-14.',
    }),
  );
  assert.equal(room.roomNumber, '909');
  assert.equal(room.status, 'available');
  assert.equal(room.housekeepingStatus, 'dirty');
  assert.ok(!('room_number' in room), 'createRoom debe devolver Model, no DTO');

  const updated = await assertServiceCall('roomService.updateRoom', () =>
    roomService.updateRoom(room.id, {
      status: 'maintenance',
      notes: 'Mantenimiento preventivo.',
    }),
  );
  assert.equal(updated.status, 'maintenance');
  assert.equal(updated.notes, 'Mantenimiento preventivo.');

  const roomTypes = await assertServiceCall('roomService.getRoomTypes', () =>
    roomService.getRoomTypes(),
  );
  assert.ok(Array.isArray(roomTypes) && roomTypes.length > 0);
  assert.ok('bedConfiguration' in roomTypes[0], 'RoomType debe ser Model camelCase');
  assert.ok(!('bed_configuration' in roomTypes[0]), 'RoomType no debe traer campos DTO');
});

test('bookingService.checkIn/checkOut: validan transiciones con BOOKING_STATUS_TRANSITIONS', async () => {
  const checkedIn = await assertServiceCall('bookingService.checkIn', () =>
    bookingService.checkIn('BKG-009'),
  );
  assert.equal(checkedIn.status, 'checkedIn');

  const checkedOut = await assertServiceCall('bookingService.checkOut', () =>
    bookingService.checkOut('BKG-009'),
  );
  assert.equal(checkedOut.status, 'checkedOut');

  await assert.rejects(
    () => bookingService.checkIn('BKG-009'),
    /Transicion invalida de reserva/,
    'no debe permitir salir de checkedOut hacia checkedIn',
  );
});

test('ciclo completo de una reserva nueva: crear, confirmar, check-in abre la cuenta del huésped', async () => {
  const booking = await assertServiceCall('bookingService.createBooking', () =>
    bookingService.createBooking({
      guest_id: 'GST-001',
      room_type_id: 'RT-01',
      check_in: '2026-11-01',
      check_out: '2026-11-03',
      adults: 1,
      children: 0,
    }),
  );
  assert.equal(booking.status, 'pending');

  const noAccountYet = await guestAccountService.getAccountByBookingId(booking.id);
  assert.equal(noAccountYet, undefined, 'una reserva pending todavía no debe tener cuenta');

  const confirmed = await assertServiceCall('bookingService.confirmBooking', () =>
    bookingService.confirmBooking(booking.id),
  );
  assert.equal(confirmed.status, 'confirmed');

  const checkedIn = await assertServiceCall('bookingService.checkIn', () =>
    bookingService.checkIn(booking.id),
  );
  assert.equal(checkedIn.status, 'checkedIn');

  const account = await guestAccountService.getAccountByBookingId(booking.id);
  assert.ok(account, 'el check-in debe crear la cuenta del huésped si no existía');
  assert.equal(account.status, 'open');
  assert.equal(
    account.balanceCents,
    booking.totalAmountCents,
    'la cuenta nueva nace con el cargo base de estancia',
  );

  await assert.rejects(
    () => bookingService.checkIn(booking.id),
    /Transicion invalida de reserva/,
    'un segundo check-in sobre una reserva ya checkedIn debe rechazar, no duplicar la cuenta',
  );

  const accountsForBooking = (await guestAccountService.getAccounts()).filter(
    (item) => item.bookingId === booking.id,
  );
  assert.equal(
    accountsForBooking.length,
    1,
    'no debe crear una segunda cuenta para la misma reserva',
  );
  const stayCharges = (await guestAccountService.getChargesByBookingId(booking.id)).filter(
    (charge) => charge.category === 'stay' && charge.status !== 'voided',
  );
  assert.equal(
    stayCharges.length,
    booking.totalAmountCents > 0 ? 1 : 0,
    'el cargo de estancia no debe duplicarse',
  );
});

test('bookingService valida capacidad del tipo de habitacion al crear y editar', async () => {
  await assert.rejects(
    () =>
      bookingService.createBooking({
        guest_id: 'GST-001',
        room_type_id: 'RT-01',
        check_in: '2026-12-01',
        check_out: '2026-12-03',
        adults: 2,
        children: 1,
      }),
    /permite maximo 2 huesped/,
    'RT-01 tiene capacidad 2 y no debe aceptar 3 huespedes',
  );

  const exactCapacity = await assertServiceCall('bookingService.createBooking exact capacity', () =>
    bookingService.createBooking({
      guest_id: 'GST-001',
      room_type_id: 'RT-01',
      check_in: '2026-12-04',
      check_out: '2026-12-06',
      adults: 1,
      children: 1,
    }),
  );
  assert.equal(exactCapacity.adults + exactCapacity.children, 2);

  await assert.rejects(
    () =>
      bookingService.updateBooking(exactCapacity.id, {
        room_type_id: 'RT-03',
        adults: 3,
        children: 1,
      }),
    /permite maximo 3 huesped/,
    'al editar debe revalidar la capacidad del nuevo tipo seleccionado',
  );

  const stillValid = await bookingService.getBookingById(exactCapacity.id);
  assert.equal(stillValid.adults, 1, 'una edicion invalida no debe mutar adultos');
  assert.equal(stillValid.children, 1, 'una edicion invalida no debe mutar menores');
  assert.equal(stillValid.roomTypeId, 'RT-01', 'una edicion invalida no debe mutar habitacion');
});

test('check-in de recepcion persiste acompanantes, titular y ocupacion de habitacion', async () => {
  await assert.rejects(
    () =>
      bookingCompanionService.saveCompanionsForBooking('BKG-007', [
        {
          first_name: 'Acompanante',
          last_name: 'Incorrecto',
          document_type: 'national_id',
          document_number: '1111 22222 0101',
          guest_type: 'child',
        },
      ]),
    /composicion/,
    'BKG-007 espera un acompanante adulto, no un menor',
  );

  const companions = await assertServiceCall(
    'bookingCompanionService.saveCompanionsForBooking',
    () =>
      bookingCompanionService.saveCompanionsForBooking('BKG-007', [
        {
          first_name: 'Marcos',
          last_name: 'Rodas',
          document_type: 'national_id',
          document_number: '1234 56789 0101',
          guest_type: 'adult',
        },
      ]),
  );
  assert.equal(companions.length, 1);
  assert.equal(companions[0].bookingId, 'BKG-007');
  assert.equal(companions[0].guestType, 'adult');

  const updatedGuest = await assertServiceCall('guestService.updateGuest', () =>
    guestService.updateGuest('GST-007', {
      document_type: 'driver_license',
      document_number: 'LIC-777',
    }),
  );
  assert.equal(updatedGuest.documentType, 'driverLicense');
  assert.equal(updatedGuest.documentNumber, 'LIC-777');

  const checkedIn = await assertServiceCall('bookingService.checkIn BKG-007', () =>
    bookingService.checkIn('BKG-007'),
  );
  assert.equal(checkedIn.status, 'checkedIn');

  const room = await roomService.getRoomById('RM-203');
  assert.equal(room.status, 'occupied', 'el check-in debe marcar la habitacion como ocupada');

  const persisted = await bookingCompanionService.getCompanionsByBookingId('BKG-007');
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].documentNumber, '1234 56789 0101');
});

test('bookingService.assignRoom: asigna solo habitaciones asignables con isRoomAssignable', async () => {
  const booking = await assertServiceCall('bookingService.assignRoom', () =>
    bookingService.assignRoom('BKG-008', 'RM-403'),
  );
  assert.equal(booking.roomId, 'RM-403');

  await assert.rejects(
    () => bookingService.assignRoom('BKG-010', 'RM-502'),
    /no esta disponible para asignacion/,
    'available + dirty no es asignable',
  );
});

test('guestAccountService.createCharge: crea Charge y actualiza el balance guardado', async () => {
  const before = await assertServiceCall('guestAccountService.getAccountByBookingId', () =>
    guestAccountService.getAccountByBookingId('BKG-002'),
  );
  assert.ok(before);

  const charge = await assertServiceCall('guestAccountService.createCharge', () =>
    guestAccountService.createCharge({
      booking_id: 'BKG-002',
      description: 'Cargo de prueba WEB-14',
      quantity: 2,
      unit_price_cents: 1250,
      currency: 'GTQ',
      created_by_user_id: 'USR-001',
    }),
  );
  assert.equal(charge.amountCents, 2500);
  assert.equal(charge.status, 'posted');
  assert.ok(!('amount_cents' in charge), 'createCharge debe devolver Model, no DTO');

  const after = await assertServiceCall('guestAccountService.getAccountByBookingId', () =>
    guestAccountService.getAccountByBookingId('BKG-002'),
  );
  assert.equal(after.balanceCents, before.balanceCents + 2500);
});

test('check-out exige saldo exactamente cero, cierra folio y envia habitacion a limpieza', async () => {
  const overpaid = await assertServiceCall(
    'guestAccountService.getAccountByBookingId BKG-002',
    () => guestAccountService.getAccountByBookingId('BKG-002'),
  );
  assert.ok(overpaid);
  assert.ok(overpaid.balanceCents < 0, 'BKG-002 debe iniciar con saldo a favor');

  await assert.rejects(
    () => bookingService.checkOut('BKG-002'),
    /exactamente en 0 centavos/,
    'no debe permitir check-out con saldo negativo',
  );

  const before = await assertServiceCall('guestAccountService.getAccountByBookingId BKG-003', () =>
    guestAccountService.getAccountByBookingId('BKG-003'),
  );
  assert.ok(before);
  assert.ok(before.balanceCents > 0, 'BKG-003 debe iniciar con saldo pendiente');

  await assert.rejects(
    () => bookingService.checkOut('BKG-003'),
    /exactamente en 0 centavos/,
    'no debe permitir check-out con saldo pendiente',
  );

  const payment = await assertServiceCall('guestAccountService.createPayment', () =>
    guestAccountService.createPayment({
      booking_id: 'BKG-003',
      amount_cents: before.balanceCents,
      currency: before.currency,
      method: 'cash',
      transaction_reference: 'RCB-ISSUE-71',
    }),
  );
  assert.equal(payment.status, 'completed');

  const settled = await guestAccountService.getAccountByBookingId('BKG-003');
  assert.equal(settled.balanceCents, 0);

  const checkedOut = await assertServiceCall('bookingService.checkOut BKG-003', () =>
    bookingService.checkOut('BKG-003'),
  );
  assert.equal(checkedOut.status, 'checkedOut');

  const closed = await guestAccountService.getAccountByBookingId('BKG-003');
  assert.equal(closed.status, 'closed');
  assert.equal(closed.balanceCents, 0);

  const room = await roomService.getRoomById('RM-301');
  assert.equal(room.status, 'available');
  assert.equal(room.housekeepingStatus, 'dirty');

  await assert.rejects(
    () => bookingService.checkOut('BKG-003'),
    /ya esta cerrada|Transicion invalida/,
    'no debe permitir un segundo check-out de la misma estancia',
  );
});
