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
      export { promotionService } from './src/services/promotionService';
      export { housekeepingService } from './src/services/housekeepingService';
      export { orderService } from './src/services/orderService';
      export { serviceRequestService } from './src/services/serviceRequestService';
      export { notificationService } from './src/services/notificationService';
      export { notificationReadsDB } from './src/data/db';
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

const storageValues = new Map();
globalThis.localStorage = {
  getItem(key) {
    return storageValues.has(key) ? storageValues.get(key) : null;
  },
  setItem(key, value) {
    storageValues.set(key, String(value));
  },
  removeItem(key) {
    storageValues.delete(key);
  },
  clear() {
    storageValues.clear();
  },
};

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
  promotionService,
  housekeepingService,
  orderService,
  serviceRequestService,
  notificationService,
  notificationReadsDB,
  mockUtils,
} = require(require.resolve('../.cache/services-harness.cjs'));

const apiNow = '2026-10-02T12:00:00.000Z';
const apiProducts = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    sku: 'RS-COFFEE',
    name: 'Cafe americano',
    description: 'Cafe de la casa',
    category: 'food_and_beverage',
    priceCents: 1500,
    currency: 'GTQ',
    active: true,
    createdAt: apiNow,
    updatedAt: apiNow,
  },
  {
    id: '11111111-1111-4111-8111-222222222222',
    sku: 'RS-CAKE',
    name: 'Pastel de chocolate',
    description: 'Postre de la casa',
    category: 'food_and_beverage',
    priceCents: 2800,
    currency: 'GTQ',
    active: false,
    createdAt: apiNow,
    updatedAt: apiNow,
  },
];
const apiAmenities = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Piscina',
    description: 'Piscina principal',
    category: 'hotel',
    location: 'Terraza',
    opensAt: '08:00',
    closesAt: '20:00',
    active: true,
    createdAt: apiNow,
    updatedAt: apiNow,
  },
  {
    id: '22222222-2222-4222-8222-333333333333',
    name: 'Spa',
    description: 'Tratamientos con reserva',
    category: 'service',
    location: 'Nivel 2',
    opensAt: '10:00',
    closesAt: '18:00',
    active: false,
    createdAt: apiNow,
    updatedAt: apiNow,
  },
];
const apiUsers = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    firstName: 'Jose',
    lastName: 'Perez',
    email: 'jose@example.com',
    roleCode: 'ADMIN',
    status: 'active',
    createdAt: apiNow,
    updatedAt: apiNow,
  },
];
const apiRoles = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    code: 'ADMIN',
    name: 'Administrador',
    active: true,
    permissions: ['admin.dashboard.view'],
  },
];
const apiPromotions = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    code: 'EARLY',
    name: 'Reserva anticipada',
    description: 'Descuento base',
    discountPercent: 10,
    validFrom: '2026-12-01',
    validTo: '2026-12-31',
    active: true,
    createdAt: apiNow,
    updatedAt: apiNow,
  },
];
const apiInventoryItems = [
  {
    id: '66666666-6666-4666-8666-666666666666',
    sku: 'HK-TOWEL',
    name: 'Toalla blanca',
    description: 'Toalla de habitacion',
    category: 'housekeeping',
    unit: 'unit',
    currentQuantity: 10,
    minimumQuantity: 4,
    lowStock: false,
    active: true,
    createdAt: apiNow,
    updatedAt: apiNow,
  },
];
const apiInventoryMovements = [];

function roleCodeById(roleId) {
  const role = apiRoles.find((item) => item.id === roleId);
  if (!role) return undefined;
  return role.code;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const adminFetchMock = async (input, init = {}) => {
  const url = new URL(String(input));
  const method = init.method ?? 'GET';
  const path = url.pathname.replace('/api/v1', '');
  const body = init.body ? JSON.parse(String(init.body)) : undefined;

  if (method === 'GET' && path === '/room-service/products') {
    return jsonResponse(apiProducts.filter((item) => item.active));
  }
  if (method === 'GET' && path === '/admin/room-service/products') {
    return jsonResponse(apiProducts);
  }
  if (method === 'POST' && path === '/admin/room-service/products') {
    if (!Number.isInteger(body.priceCents) || body.priceCents < 1) {
      return jsonResponse({ message: 'priceCents must be greater than or equal to 1' }, 400);
    }
    const product = {
      id: `11111111-1111-4111-8111-${String(apiProducts.length + 3).padStart(12, '0')}`,
      sku: body.sku,
      name: body.name,
      description: body.description,
      category: body.category,
      priceCents: body.priceCents,
      currency: body.currency,
      active: body.active,
      createdAt: apiNow,
      updatedAt: apiNow,
    };
    apiProducts.push(product);
    return jsonResponse(product, 201);
  }
  if (method === 'PUT' && path.startsWith('/admin/room-service/products/')) {
    const id = path.split('/').at(-1);
    const product = apiProducts.find((item) => item.id === id);
    if (!product) return jsonResponse({ message: 'Not found' }, 404);
    if (!Number.isInteger(body.priceCents) || body.priceCents < 1) {
      return jsonResponse({ message: 'priceCents must be greater than or equal to 1' }, 400);
    }
    Object.assign(product, {
      sku: body.sku,
      name: body.name,
      description: body.description,
      category: body.category,
      priceCents: body.priceCents,
      currency: body.currency,
      active: body.active,
      updatedAt: apiNow,
    });
    return jsonResponse(product);
  }
  if (method === 'GET' && path === '/admin/amenities') return jsonResponse(apiAmenities);
  if (method === 'POST' && path === '/admin/amenities') {
    const amenity = {
      id: `22222222-2222-4222-8222-${String(apiAmenities.length + 4).padStart(12, '0')}`,
      name: body.name,
      description: body.description,
      category: body.category,
      location: body.location,
      opensAt: body.opensAt,
      closesAt: body.closesAt,
      active: body.active,
      createdAt: apiNow,
      updatedAt: apiNow,
    };
    apiAmenities.push(amenity);
    return jsonResponse(amenity, 201);
  }
  if (method === 'PUT' && path.startsWith('/admin/amenities/')) {
    const id = path.split('/').at(-1);
    const amenity = apiAmenities.find((item) => item.id === id);
    if (!amenity) return jsonResponse({ message: 'Not found' }, 404);
    Object.assign(amenity, {
      name: body.name,
      description: body.description,
      category: body.category,
      location: body.location,
      opensAt: body.opensAt,
      closesAt: body.closesAt,
      active: body.active,
      updatedAt: apiNow,
    });
    return jsonResponse(amenity);
  }
  if (method === 'GET' && path === '/admin/users') return jsonResponse(apiUsers);
  if (method === 'POST' && path === '/admin/users') {
    if ('roleCode' in body || 'status' in body) {
      return jsonResponse({ message: 'CreateUserRequest does not accept roleCode/status' }, 400);
    }
    if (!body.password || !body.roleId) {
      return jsonResponse({ message: 'password and roleId are required' }, 400);
    }
    const roleCode = roleCodeById(body.roleId);
    if (!roleCode) return jsonResponse({ message: 'Role not found' }, 400);
    const user = {
      id: `33333333-3333-4333-8333-${String(apiUsers.length + 4).padStart(12, '0')}`,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      roleCode,
      status: 'active',
      createdAt: apiNow,
      updatedAt: apiNow,
    };
    apiUsers.push(user);
    return jsonResponse(user, 201);
  }
  if (method === 'GET' && path.startsWith('/admin/users/')) {
    const user = apiUsers.find((item) => path.endsWith(item.id));
    return user ? jsonResponse(user) : jsonResponse({ message: 'Not found' }, 404);
  }
  if (method === 'PUT' && path.startsWith('/admin/users/')) {
    const id = path.split('/').at(-1);
    const user = apiUsers.find((item) => item.id === id);
    if (!user) return jsonResponse({ message: 'Not found' }, 404);
    if ('roleCode' in body || 'password' in body) {
      return jsonResponse({ message: 'UpdateUserRequest does not accept roleCode/password' }, 400);
    }
    const roleCode = roleCodeById(body.roleId);
    if (!roleCode) return jsonResponse({ message: 'Role not found' }, 400);
    Object.assign(user, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      roleCode,
      status: body.status,
      updatedAt: apiNow,
    });
    return jsonResponse(user);
  }
  if (method === 'GET' && path === '/admin/roles') return jsonResponse(apiRoles);
  if (method === 'GET' && path === '/admin/promotions') return jsonResponse(apiPromotions);
  if (method === 'POST' && path === '/admin/promotions') {
    const promotion = {
      id: '77777777-7777-4777-8777-777777777777',
      code: body.code,
      name: body.name,
      description: body.description,
      discountPercent: body.discountPercent,
      validFrom: body.validFrom,
      validTo: body.validTo,
      active: body.active,
      createdAt: apiNow,
      updatedAt: apiNow,
    };
    apiPromotions.push(promotion);
    return jsonResponse(promotion, 201);
  }
  if (method === 'PUT' && path.startsWith('/admin/promotions/')) {
    const id = path.split('/').at(-1);
    const promotion = apiPromotions.find((item) => item.id === id);
    if (!promotion) return jsonResponse({ message: 'Not found' }, 404);
    Object.assign(promotion, {
      code: body.code,
      name: body.name,
      description: body.description,
      discountPercent: body.discountPercent,
      validFrom: body.validFrom,
      validTo: body.validTo,
      active: body.active,
      updatedAt: apiNow,
    });
    return jsonResponse(promotion);
  }
  if (method === 'GET' && path === '/inventory/items') return jsonResponse(apiInventoryItems);
  if (method === 'GET' && path.startsWith('/inventory/items/') && path.endsWith('/movements')) {
    const itemId = path.split('/').at(-2);
    return jsonResponse(apiInventoryMovements.filter((item) => item.inventoryItemId === itemId));
  }
  if (method === 'GET' && path.startsWith('/inventory/items/')) {
    const id = path.split('/').at(-1);
    const item = apiInventoryItems.find((entry) => entry.id === id);
    return item ? jsonResponse(item) : jsonResponse({ message: 'Not found' }, 404);
  }
  if (method === 'PUT' && path.startsWith('/admin/inventory/items/')) {
    const id = path.split('/').at(-1);
    const item = apiInventoryItems.find((entry) => entry.id === id);
    if (!item) return jsonResponse({ message: 'Not found' }, 404);
    Object.assign(item, {
      sku: body.sku,
      name: body.name,
      description: body.description,
      category: body.category,
      unit: body.unit,
      minimumQuantity: body.minimumQuantity,
      productId: body.productId,
      active: body.active,
      updatedAt: apiNow,
    });
    return jsonResponse(item);
  }
  if (method === 'POST' && path.startsWith('/inventory/items/') && path.endsWith('/movements')) {
    const itemId = path.split('/').at(-2);
    const item = apiInventoryItems.find((entry) => entry.id === itemId);
    if (!item) return jsonResponse({ message: 'Not found' }, 404);
    const nextQuantity =
      body.type === 'in'
        ? item.currentQuantity + body.quantity
        : item.currentQuantity - body.quantity;
    if (nextQuantity < 0) return jsonResponse({ message: 'Stock cannot go negative' }, 400);
    item.currentQuantity = nextQuantity;
    item.updatedAt = apiNow;
    const movement = {
      id: `${88888888 + apiInventoryMovements.length}-8888-4888-8888-888888888888`,
      inventoryItemId: itemId,
      type: body.type,
      reason: body.reason,
      quantity: body.quantity,
      occurredAt: apiNow,
      notes: body.notes,
      createdAt: apiNow,
    };
    apiInventoryMovements.unshift(movement);
    return jsonResponse(movement, 201);
  }

  return jsonResponse({ message: `Unhandled ${method} ${path}` }, 404);
};

globalThis.fetch = adminFetchMock;

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

function installFinancialFetchMock() {
  const bookingId = '8f3d5bb0-9c0a-4c24-8e56-5e3fd5406c4a';
  const guestId = '81f20327-2f16-4b6d-9dc5-caa25c822d31';
  const accountId = '64d6cfcc-22f4-4c2e-b01d-c00f737dc6e1';
  const chargeId = 'a8082035-e41a-40b8-b08f-a3856346f3c2';
  const paymentId = 'ca458699-01eb-4576-a0e9-925b81a4d83e';
  const depositId = '9a3b8b2b-604f-47d4-a8db-c72ce367508f';
  const now = '2026-10-02T10:00:00Z';
  const charges = [
    {
      id: chargeId,
      bookingId,
      productId: null,
      description: 'Estadia base',
      quantity: 1,
      unitPriceCents: 50000,
      amountCents: 50000,
      currency: 'GTQ',
      category: 'stay',
      status: 'posted',
      chargedAt: now,
      createdByUserId: null,
      voidReason: null,
      createdAt: now,
    },
  ];
  const payments = [];
  const deposits = [];
  const folio = () => ({
    accountId,
    bookingId,
    guestId,
    status: 'open',
    balanceCents:
      charges
        .filter((charge) => charge.status === 'posted')
        .reduce((sum, charge) => sum + charge.amountCents, 0) -
      payments
        .filter((payment) => payment.status === 'completed')
        .reduce((sum, payment) => sum + payment.amountCents, 0) -
      deposits
        .filter((deposit) => deposit.status === 'held' || deposit.status === 'applied')
        .reduce((sum, deposit) => sum + deposit.amountCents, 0),
    currency: 'GTQ',
    openedAt: now,
    closedAt: null,
    activeChargesCents: charges
      .filter((charge) => charge.status === 'posted')
      .reduce((sum, charge) => sum + charge.amountCents, 0),
    voidedChargesCents: charges
      .filter((charge) => charge.status === 'voided')
      .reduce((sum, charge) => sum + charge.amountCents, 0),
    completedPaymentsCents: payments
      .filter((payment) => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amountCents, 0),
    charges,
  });

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init.method ?? 'GET';
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });

    if (method === 'GET' && path === `/bookings/${bookingId}/folio`) return json(folio());
    if (method === 'POST' && path === `/bookings/${bookingId}/folio/open`) return json(folio());
    if (method === 'GET' && path === `/bookings/${bookingId}/charges`) return json(charges);
    if (method === 'POST' && path === `/bookings/${bookingId}/charges`) {
      const request = JSON.parse(String(init.body ?? '{}'));
      const charge = {
        id: 'b8082035-e41a-40b8-b08f-a3856346f3c2',
        bookingId,
        productId: request.productId ?? null,
        description: request.description,
        quantity: request.quantity,
        unitPriceCents: request.unitPriceCents,
        amountCents: request.quantity * request.unitPriceCents,
        currency: 'GTQ',
        category: request.category,
        status: 'posted',
        chargedAt: now,
        createdByUserId: null,
        voidReason: null,
        createdAt: now,
      };
      charges.push(charge);
      return json(charge, 201);
    }
    if (method === 'POST' && path === `/bookings/${bookingId}/charges/${chargeId}/void`) {
      const request = JSON.parse(String(init.body ?? '{}'));
      charges[0] = { ...charges[0], status: 'voided', voidReason: request.reason };
      return json(charges[0]);
    }
    if (method === 'GET' && path === `/bookings/${bookingId}/payments`) return json(payments);
    if (method === 'POST' && path === `/bookings/${bookingId}/payments`) {
      const request = JSON.parse(String(init.body ?? '{}'));
      const payment = {
        id: paymentId,
        bookingId,
        amountCents: request.amountCents,
        currency: 'GTQ',
        method: request.method,
        status: 'completed',
        transactionReference: request.transactionReference ?? null,
        paidAt: now,
        processedByUserId: null,
        createdAt: now,
      };
      payments.push(payment);
      return json(payment, 201);
    }
    if (method === 'GET' && path === `/bookings/${bookingId}/deposits`) return json(deposits);
    if (method === 'POST' && path === `/bookings/${bookingId}/deposits`) {
      const request = JSON.parse(String(init.body ?? '{}'));
      const deposit = {
        id: depositId,
        bookingId,
        guestId,
        amountCents: request.amountCents,
        currency: 'GTQ',
        method: request.method,
        status: 'held',
        collectedAt: now,
        refundedAt: null,
        notes: request.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      deposits.push(deposit);
      return json(deposit, 201);
    }
    if (method === 'POST' && path === `/bookings/${bookingId}/deposits/${depositId}/apply`) {
      deposits[0] = { ...deposits[0], status: 'applied', updatedAt: now };
      return json(deposits[0]);
    }
    if (method === 'POST' && path === `/bookings/${bookingId}/deposits/${depositId}/refund`) {
      deposits[0] = { ...deposits[0], status: 'refunded', refundedAt: now, updatedAt: now };
      return json(deposits[0]);
    }
    return json({ message: `Ruta financiera no mockeada en test: ${method} ${path}` }, 404);
  };

  return { bookingId, chargeId, depositId };
}

function installCashFetchMock() {
  let session = {
    id: '7a4db6cf-d72a-4fc7-b7ec-0d07fbef5104',
    openedByUserId: '6f1f5a3c-51f1-4c1e-9f66-d89d62eced0c',
    openedAt: '2026-10-02T08:00:00Z',
    openingBalanceCents: 100000,
    currency: 'GTQ',
    status: 'open',
    totalIncomeCents: 0,
    totalExpenseCents: 0,
    expectedBalanceCents: 100000,
    closedByUserId: null,
    closedAt: null,
    countedBalanceCents: null,
    differenceCents: null,
    notes: 'Caja de prueba',
    createdAt: '2026-10-02T08:00:00Z',
    updatedAt: '2026-10-02T08:00:00Z',
  };
  const movements = [];

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init.method ?? 'GET';
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });

    if (method === 'GET' && path === '/cash-sessions/current') return json(session);

    if (method === 'POST' && path === '/cash-sessions/open') {
      const request = JSON.parse(String(init.body ?? '{}'));
      session = {
        ...session,
        id: 'e1c5846d-bdc9-4f0a-8dcf-ef9dd5670720',
        openingBalanceCents: request.openingBalanceCents,
        totalIncomeCents: 0,
        totalExpenseCents: 0,
        expectedBalanceCents: request.openingBalanceCents,
        status: 'open',
        notes: request.notes,
      };
      movements.length = 0;
      return json(session, 201);
    }

    if (method === 'POST' && path === `/cash-sessions/${session.id}/close`) {
      const request = JSON.parse(String(init.body ?? '{}'));
      session = {
        ...session,
        status: 'closed',
        closedAt: '2026-10-02T16:00:00Z',
        countedBalanceCents: request.countedBalanceCents,
        differenceCents: request.countedBalanceCents - session.expectedBalanceCents,
        notes: request.notes ?? session.notes,
      };
      return json(session);
    }

    if (method === 'GET' && path === `/cash-sessions/${session.id}/movements`) {
      return json(movements);
    }

    if (method === 'POST' && path === `/cash-sessions/${session.id}/movements`) {
      const request = JSON.parse(String(init.body ?? '{}'));
      const movement = {
        id: `4e6e9400-879b-4b7e-8e8c-${String(movements.length + 1).padStart(12, '0')}`,
        cashSessionId: session.id,
        type: request.type,
        concept: request.concept,
        amountCents: request.amountCents,
        currency: 'GTQ',
        responsibleUserId: null,
        occurredAt: '2026-10-02T09:00:00Z',
        paymentId: null,
        createdAt: '2026-10-02T09:00:00Z',
      };
      movements.unshift(movement);
      session = {
        ...session,
        totalIncomeCents:
          session.totalIncomeCents + (movement.type === 'income' ? movement.amountCents : 0),
        totalExpenseCents:
          session.totalExpenseCents + (movement.type === 'expense' ? movement.amountCents : 0),
        expectedBalanceCents:
          session.expectedBalanceCents +
          (movement.type === 'income' ? movement.amountCents : -movement.amountCents),
      };
      return json(movement, 201);
    }

    return json({ message: `Ruta no mockeada en test: ${method} ${path}` }, 404);
  };
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
  globalThis.fetch = adminFetchMock;
  const products = await assertServiceCall('catalogService.getProducts', () =>
    catalogService.getProducts(),
  );
  assert.ok(Array.isArray(products) && products.length > 0);
  assert.ok('priceCents' in products[0], 'el Model de Product debe tener priceCents');
  assert.ok(!('price_cents' in products[0]), 'un Model no debe traer campos snake_case del DTO');
  assert.ok(
    products.every((product) => product.active),
    'el catalogo operativo solo lista activos',
  );

  const adminProducts = await assertServiceCall('catalogService.getAdminProducts', () =>
    catalogService.getAdminProducts(),
  );
  assert.ok(
    adminProducts.some((product) => !product.active),
    'el catalogo administrativo incluye productos inactivos',
  );
  const product = await catalogService.createAdminProduct({
    sku: 'RS-TEA',
    name: 'Te frio',
    description: 'Bebida fria',
    category: 'food_and_beverage',
    priceCents: 1200,
    currency: 'GTQ',
    active: true,
  });
  assert.equal(product.sku, 'RS-TEA');
  const disabledProduct = await catalogService.updateAdminProduct(product.id, { active: false });
  assert.equal(disabledProduct.active, false);

  const amenities = await assertServiceCall('catalogService.getAmenities', () =>
    catalogService.getAmenities(),
  );
  assert.ok(Array.isArray(amenities) && amenities.length > 0);

  const adminAmenities = await assertServiceCall('catalogService.getAdminAmenities', () =>
    catalogService.getAdminAmenities(),
  );
  assert.ok(
    adminAmenities.some((amenity) => !amenity.active),
    'administracion debe listar amenidades inactivas',
  );
  const amenity = await catalogService.createAmenity({
    name: 'Sauna',
    description: 'Sauna seco',
    category: 'service',
    location: 'Spa',
    opensAt: '09:00',
    closesAt: '17:00',
    active: true,
  });
  assert.equal(amenity.name, 'Sauna');
  const disabledAmenity = await catalogService.updateAmenity(amenity.id, { active: false });
  assert.equal(disabledAmenity.active, false);
});

test('guestAccountService.getAccounts: async, con latencia simulada, devuelve Models', async () => {
  const accounts = await assertServiceCall('guestAccountService.getAccounts', () =>
    guestAccountService.getAccounts(),
  );
  assert.ok(Array.isArray(accounts) && accounts.length > 0);
  assert.ok('balanceCents' in accounts[0], 'el Model de GuestAccount debe tener balanceCents');
  assert.ok(!('balance_cents' in accounts[0]), 'un Model no debe traer campos snake_case del DTO');
});

test('guestAccountService: usa backend para folio financiero integrado', async () => {
  const { bookingId, chargeId, depositId } = installFinancialFetchMock();
  const account = await guestAccountService.getAccountByBookingId(bookingId);
  assert.ok(account);
  assert.equal(account.bookingId, bookingId);
  assert.equal(account.balanceCents, 50000);

  const charge = await guestAccountService.createCharge({
    booking_id: bookingId,
    description: 'Consumo minibar',
    quantity: 2,
    unit_price_cents: 1500,
    currency: 'GTQ',
    category: 'consumption',
  });
  assert.equal(charge.amountCents, 3000);
  assert.equal(charge.status, 'posted');
  assert.ok(!('amount_cents' in charge), 'createCharge integrado debe devolver Model');

  const voided = await guestAccountService.voidCharge(chargeId, 'Correccion de cargo', bookingId);
  assert.equal(voided.status, 'voided');
  assert.equal(voided.voidReason, 'Correccion de cargo');

  assert.throws(
    () => guestAccountService.calculateBalanceCents(bookingId),
    /folio mock/,
    'el saldo oficial de una reserva UUID no debe calcularse localmente',
  );
  await assert.rejects(
    () => guestAccountService.voidCharge(chargeId, 'Sin booking'),
    /requiere bookingId/,
    'un cargo UUID sin bookingId no debe caer al mock legacy',
  );

  const payment = await guestAccountService.createPayment({
    booking_id: bookingId,
    amount_cents: 20000,
    currency: 'GTQ',
    method: 'cash',
    transaction_reference: 'REC-001',
  });
  assert.equal(payment.amountCents, 20000);
  assert.equal(payment.status, 'completed');

  const deposit = await guestAccountService.createDeposit({
    bookingId,
    amountCents: 10000,
    method: 'cash',
    notes: 'Garantia',
  });
  assert.equal(deposit.status, 'held');

  const applied = await guestAccountService.applyDeposit(bookingId, depositId);
  assert.equal(applied.status, 'applied');

  const refunded = await guestAccountService.refundDeposit(bookingId, depositId, 'Devolucion');
  assert.equal(refunded.status, 'refunded');
});

test('cashService.getSessions: usa backend y devuelve Models', async () => {
  installCashFetchMock();
  const sessions = await cashService.getSessions();
  assert.ok(Array.isArray(sessions) && sessions.length > 0);
  assert.ok(
    'openingBalanceCents' in sessions[0],
    'el Model de CashSession debe tener openingBalanceCents',
  );
  assert.ok(!('openingBalanceCents' in sessions[0] && 'opening_balance_cents' in sessions[0]));
  assert.equal(sessions[0].expectedBalanceCents, 100000);
});

test('personnelService.getUsers/getRoles/getPermissions: async, con latencia simulada, devuelven Models', async () => {
  globalThis.fetch = adminFetchMock;
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

  const created = await personnelService.createUser({
    firstName: 'Ana',
    lastName: 'Lopez',
    email: 'ana@example.com',
    password: 'Temporal123!',
    roleId: apiRoles[0].id,
  });
  assert.equal(created.email, 'ana@example.com');
  const disabled = await personnelService.updateUser(created.id, {
    roleId: apiRoles[0].id,
    status: 'inactive',
  });
  assert.equal(disabled.status, 'inactive');
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

const HK_ROOM_ID = '0b6f4c2e-1d7a-4c5e-9f3b-2a1d0e9c8b70';
const HK_BOOKING_ID = '5c2d8e1f-3b4a-4f6e-8d7c-1a2b3c4d5e6f';

function installHousekeepingFetchMock() {
  const previousFetch = globalThis.fetch;
  const calls = [];
  let room = {
    id: HK_ROOM_ID,
    roomNumber: '204',
    roomTypeId: 'a1b2c3d4-0000-4000-8000-000000000001',
    floor: 2,
    status: 'occupied',
    housekeepingStatus: 'dirty',
    notes: null,
    cleaningUserEmail: null,
    cleaningStartedAt: null,
    cleaningCompletedByUserEmail: null,
    cleaningCompletedAt: null,
    inspectorUserEmail: null,
    inspectedAt: null,
    updatedAt: '2026-10-03T08:00:00Z',
  };
  const stayovers = [
    {
      id: 'f1e2d3c4-0000-4000-8000-000000000001',
      bookingId: HK_BOOKING_ID,
      roomId: HK_ROOM_ID,
      roomNumber: '204',
      status: 'pending',
      description: 'Cambio de toallas',
      notes: null,
      responsibleUserEmail: null,
      startedByUserEmail: null,
      completedByUserEmail: null,
      requestedAt: '2026-10-03T09:00:00Z',
      startedAt: null,
      completedAt: null,
      createdAt: '2026-10-03T09:00:00Z',
      updatedAt: '2026-10-03T09:00:00Z',
    },
    {
      id: 'f1e2d3c4-0000-4000-8000-000000000002',
      bookingId: HK_BOOKING_ID,
      roomId: HK_ROOM_ID,
      roomNumber: '204',
      status: 'cancelled',
      description: 'Cancelada por el huesped',
      requestedAt: '2026-10-03T07:00:00Z',
      createdAt: '2026-10-03T07:00:00Z',
      updatedAt: '2026-10-03T07:30:00Z',
    },
  ];
  // Mismo flujo que HousekeepingServiceImpl: estado de origen exacto o 400.
  const turnover = {
    start: ['dirty', 'cleaning', 'cleaningStartedAt'],
    complete: ['cleaning', 'clean', 'cleaningCompletedAt'],
    inspect: ['clean', 'inspected', 'inspectedAt'],
  };
  const stayoverFlow = {
    start: ['pending', 'in_progress', 'startedAt'],
    complete: ['in_progress', 'completed', 'completedAt'],
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init.method ?? 'GET';
    calls.push(`${method} ${path}${url.search}`);
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });

    if (method === 'GET' && path === '/housekeeping/rooms') return json([room]);

    const roomAction = path.match(/^\/housekeeping\/rooms\/([^/]+)\/(start|complete|inspect)$/);
    if (method === 'POST' && roomAction && roomAction[1] === HK_ROOM_ID) {
      const [from, to, timestampField] = turnover[roomAction[2]];
      if (room.housekeepingStatus !== from) {
        return json({ status: 400, message: `Cannot ${roomAction[2]} room` }, 400);
      }
      room = {
        ...room,
        housekeepingStatus: to,
        [timestampField]: '2026-10-03T10:30:00Z',
        ...(to === 'cleaning'
          ? { cleaningStartedAt: '2026-10-03T10:00:00Z', cleaningUserEmail: 'hk@aurora.test' }
          : {}),
      };
      return json(room);
    }

    if (method === 'GET' && path === '/housekeeping/rooms/stayover-cleanings') {
      const status = url.searchParams.get('status');
      const bookingId = url.searchParams.get('bookingId');
      return json(
        stayovers.filter(
          (item) =>
            (!status || item.status === status) && (!bookingId || item.bookingId === bookingId),
        ),
      );
    }

    const stayoverAction = path.match(
      /^\/housekeeping\/rooms\/stayover-cleanings\/([^/]+)\/(start|complete)$/,
    );
    if (method === 'POST' && stayoverAction) {
      const index = stayovers.findIndex((item) => item.id === stayoverAction[1]);
      if (index < 0) return json({ status: 404, message: 'Stayover cleaning not found' }, 404);
      const [from, to, timestampField] = stayoverFlow[stayoverAction[2]];
      if (stayovers[index].status !== from) return json({ status: 400, message: 'Cannot' }, 400);
      stayovers[index] = {
        ...stayovers[index],
        status: to,
        [timestampField]: '2026-10-03T11:00:00Z',
      };
      return json(stayovers[index]);
    }

    if (method === 'POST' && path === `/housekeeping/rooms/${HK_ROOM_ID}/stayover-cleanings`) {
      const request = JSON.parse(String(init.body ?? '{}'));
      const created = {
        ...stayovers[0],
        id: 'f1e2d3c4-0000-4000-8000-000000000003',
        bookingId: request.bookingId,
        status: 'pending',
        description: request.description ?? 'Stayover cleaning',
      };
      stayovers.push(created);
      return json(created, 201);
    }

    return json({ message: `Ruta no mockeada en test: ${method} ${path}` }, 404);
  };
  // Otros tests (caja) siguen usando el mock de fetch que estaba instalado.
  return { calls, restore: () => (globalThis.fetch = previousFetch) };
}

test('housekeepingService: turnover contra backend, sin transiciones locales', async (t) => {
  const { calls, restore } = installHousekeepingFetchMock();
  t.after(restore);

  const [room] = await housekeepingService.getRooms();
  assert.equal(room.roomNumber, '204');
  assert.equal(room.housekeepingStatus, 'dirty');
  assert.equal(room.status, 'occupied');
  assert.ok(!('housekeeping_status' in room), 'un Model no debe traer campos snake_case del DTO');

  await housekeepingService.saveChecklist(HK_ROOM_ID, [{ label: 'Cama preparada', done: true }]);
  assert.equal((await housekeepingService.getChecklists())[0].items[0].done, true);

  const cleaning = await housekeepingService.startCleaning(HK_ROOM_ID);
  assert.equal(cleaning.housekeepingStatus, 'cleaning');
  assert.equal(cleaning.status, 'occupied', 'el turnover no toca el estado operativo');
  assert.ok(cleaning.cleaningStartedAt instanceof Date);
  assert.equal(cleaning.cleaningUserEmail, 'hk@aurora.test');
  assert.deepEqual(
    await housekeepingService.getChecklists(),
    [],
    'iniciar un turnover nuevo descarta el checklist del ciclo anterior',
  );

  await assert.rejects(
    () => housekeepingService.inspectRoom(HK_ROOM_ID),
    /rechazó la transición/,
    'el backend decide: cleaning -> inspected se rechaza',
  );

  const clean = await housekeepingService.completeCleaning(HK_ROOM_ID);
  assert.equal(clean.housekeepingStatus, 'clean');
  assert.ok(clean.cleaningCompletedAt instanceof Date);

  const inspected = await housekeepingService.inspectRoom(HK_ROOM_ID);
  assert.equal(inspected.housekeepingStatus, 'inspected');
  assert.ok(inspected.inspectedAt instanceof Date);

  assert.deepEqual(
    calls.filter((call) => call.startsWith('POST')),
    [
      `POST /housekeeping/rooms/${HK_ROOM_ID}/start`,
      `POST /housekeeping/rooms/${HK_ROOM_ID}/inspect`,
      `POST /housekeeping/rooms/${HK_ROOM_ID}/complete`,
      `POST /housekeeping/rooms/${HK_ROOM_ID}/inspect`,
    ],
    'cada transicion pasa por su endpoint de HousekeepingController',
  );
});

test('housekeepingService: stayover como flujo separado del turnover', async (t) => {
  const { calls, restore } = installHousekeepingFetchMock();
  t.after(restore);

  const all = await housekeepingService.getStayoverCleanings();
  assert.equal(all.length, 2);
  assert.equal(all[0].type, 'housekeeping');
  assert.equal(all[1].status, 'rejected', 'cancelled del backend se representa como rejected');

  const pending = await housekeepingService.getStayoverCleanings({ status: 'pending' });
  assert.equal(pending.length, 1);
  assert.ok(calls.includes('GET /housekeeping/rooms/stayover-cleanings?status=pending'));

  const started = await housekeepingService.startStayoverCleaning(pending[0].id);
  assert.equal(started.status, 'inProgress');
  assert.ok(started.startedAt instanceof Date);
  const completed = await housekeepingService.completeStayoverCleaning(pending[0].id);
  assert.equal(completed.status, 'completed');
  assert.ok(completed.completedAt instanceof Date);

  await housekeepingService.getStayoverCleanings({ status: 'inProgress' });
  assert.ok(calls.includes('GET /housekeeping/rooms/stayover-cleanings?status=in_progress'));

  const created = await housekeepingService.createStayoverCleaning(HK_ROOM_ID, {
    bookingId: HK_BOOKING_ID,
    description: '  Repaso de baño  ',
  });
  assert.equal(created.status, 'pending');
  assert.equal(created.description, 'Repaso de baño');

  const [room] = await housekeepingService.getRooms();
  assert.equal(room.housekeepingStatus, 'dirty', 'stayover no cambia housekeepingStatus');
  assert.equal(room.status, 'occupied', 'stayover no libera la habitacion');
});

test('housekeeping: persiste estado de habitacion mock, solicitudes y desperfectos', async () => {
  const room = await assertServiceCall('roomService.updateRoom housekeeping cleaning', () =>
    roomService.updateRoom('RM-101', { housekeeping_status: 'cleaning' }),
  );
  assert.equal(room.housekeepingStatus, 'cleaning');
  assert.match(
    storageValues.get('PMS_ROOMS_DB'),
    /"housekeeping_status":"cleaning"/,
    'el estado de limpieza debe quedar persistido en localStorage',
  );

  const pending = await assertServiceCall('serviceRequestService.createRequest', () =>
    serviceRequestService.createRequest({
      bookingId: 'BKG-016',
      roomId: 'RM-101',
      guestId: 'GST-004',
      type: 'housekeeping',
      description: 'Toallas adicionales',
    }),
  );
  const accepted = await assertServiceCall(
    'serviceRequestService.updateRequestStatus accepted',
    () => serviceRequestService.updateRequestStatus(pending.id, 'accepted'),
  );
  assert.equal(accepted.status, 'accepted');
  const completed = await assertServiceCall(
    'serviceRequestService.updateRequestStatus completed',
    () => serviceRequestService.updateRequestStatus(pending.id, 'completed'),
  );
  assert.equal(completed.status, 'completed');

  const defect = await assertServiceCall('serviceRequestService.createMaintenanceReport', () =>
    serviceRequestService.createMaintenanceReport({
      roomId: 'RM-101',
      description: 'Lampara sin funcionar',
      notes: 'Alta',
    }),
  );
  assert.equal(defect.type, 'maintenance');
  assert.equal(defect.status, 'pending');
  assert.equal(defect.bookingId, 'BKG-016');
  assert.match(storageValues.get('PMS_SERVICE_REQUESTS_DB'), /Lampara sin funcionar/);

  await assert.rejects(
    () =>
      serviceRequestService.createMaintenanceReport({
        roomId: 'RM-102',
        description: 'Reporte sin estancia activa',
      }),
    /No existe una reserva activa/,
    'un reporte de mantenimiento no debe inventar booking_id si no hay reserva real',
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

test('administracion: promociones, tarifas, inventario y caja persisten operaciones soportadas', async () => {
  globalThis.fetch = adminFetchMock;
  const roomTypes = await roomService.getRoomTypes();
  assert.ok(roomTypes.length > 0, 'debe existir al menos un tipo de habitacion para crear tarifa');

  const rate = await roomService.createRate({
    room_type_id: roomTypes[0].id,
    name: 'Prueba Administracion',
    valid_from: '2026-12-01',
    valid_to: '2026-12-15',
    price_cents: 199900,
    active: true,
  });
  assert.equal(rate.currency, 'GTQ');
  assert.equal(rate.priceCents, 199900);

  const inactiveRate = await roomService.updateRate(rate.id, { active: false });
  assert.equal(inactiveRate.active, false);

  const promotion = await promotionService.createPromotion({
    code: 'ADMIN75',
    name: 'Prueba administracion',
    description: 'Persistencia de promociones desde Administracion',
    discount_percent: 12,
    valid_from: '2026-12-01',
    valid_to: '2026-12-31',
    active: true,
  });
  assert.equal(promotion.code, 'ADMIN75');

  const disabledPromotion = await promotionService.updatePromotion(promotion.id, {
    active: false,
  });
  assert.equal(disabledPromotion.active, false);

  const user = await personnelService.createUser({
    firstName: 'Mario',
    lastName: 'Admin',
    email: 'mario.admin@example.com',
    password: 'Temporal123!',
    roleId: apiRoles[0].id,
  });
  const updatedUser = await personnelService.updateUser(user.id, {
    roleId: apiRoles[0].id,
    status: 'inactive',
  });
  assert.equal(updatedUser.status, 'inactive');

  const amenity = await catalogService.createAmenity({
    name: 'Terraza',
    description: 'Terraza panoramica',
    category: 'hotel',
    location: 'Azotea',
    active: true,
  });
  const inactiveAmenity = await catalogService.updateAmenity(amenity.id, { active: false });
  assert.equal(inactiveAmenity.active, false);

  const adminProduct = await catalogService.createAdminProduct({
    sku: 'RS-SOUP',
    name: 'Sopa del dia',
    description: 'Entrada caliente',
    category: 'food_and_beverage',
    priceCents: 3200,
    active: true,
  });
  const inactiveAdminProduct = await catalogService.updateAdminProduct(adminProduct.id, {
    active: false,
  });
  assert.equal(inactiveAdminProduct.active, false);

  const inventoryItems = await inventoryService.getItems();
  const item = inventoryItems.find((entry) => entry.active);
  assert.ok(item, 'debe existir un item activo para registrar movimiento');
  const renamed = await inventoryService.updateItem(item.id, {
    name: 'Toalla blanca premium',
    minimum_quantity: item.minimumQuantity + 1,
  });
  assert.equal(renamed.name, 'Toalla blanca premium');
  assert.equal(renamed.minimumQuantity, item.minimumQuantity + 1);
  const movement = await inventoryService.createMovement({
    inventoryItemId: item.id,
    type: 'in',
    reason: 'restock',
    quantity: 3,
  });
  assert.equal(movement.inventoryItemId, item.id);
  assert.equal(movement.quantity, 3);
  assert.equal(
    movement.responsibleUserId,
    undefined,
    'un movimiento sin usuario operativo no debe atribuirse a un fallback',
  );
  await assert.rejects(
    () =>
      inventoryService.createMovement({
        inventoryItemId: item.id,
        type: 'in',
        reason: 'restock',
        quantity: 1,
        responsibleUserId: 'USR-NO-EXISTE',
      }),
    /usuario responsable/,
  );

  const updatedItem = await inventoryService.getItemById(item.id);
  assert.equal(updatedItem.currentQuantity, renamed.currentQuantity + 3);

  const adjustedItem = await inventoryService.updateItem(item.id, {
    current_quantity: updatedItem.currentQuantity - 2,
  });
  assert.equal(adjustedItem.currentQuantity, updatedItem.currentQuantity - 2);
  assert.ok(
    (await inventoryService.getMovementsByItemId(item.id)).some(
      (entry) => entry.reason === 'shrinkage' && entry.quantity === 2,
    ),
    'los ajustes de stock deben pasar por movimientos de inventario',
  );

  installCashFetchMock();
  const beforeCashMovements = await cashService.getMovements();
  const cashMovement = await cashService.createMovement({
    type: 'income',
    concept: 'Prueba administracion',
    amountCents: 1500,
  });
  assert.equal(cashMovement.amountCents, 1500);
  assert.equal(
    cashMovement.responsibleUserId,
    undefined,
    'un movimiento de caja sin usuario operativo no debe atribuirse a un fallback',
  );
  assert.equal((await cashService.getMovements()).length, beforeCashMovements.length + 1);
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

test('portal de huesped persiste pedidos, solicitudes, perfil y notificaciones', async () => {
  const order = await assertServiceCall('orderService.createOrder', () =>
    orderService.createOrder({
      bookingId: 'BKG-002',
      roomId: 'RM-201',
      guestId: 'GST-002',
      items: [{ productId: 'PRD-001', quantity: 2 }],
      notes: 'Sin hielo.',
    }),
  );
  assert.equal(order.bookingId, 'BKG-002');
  assert.equal(order.guestId, 'GST-002');
  assert.equal(order.status, 'pending');
  assert.equal(order.items[0].unitPriceCents, 1500);

  const guestOrders = await orderService.getOrdersByGuestId('GST-002');
  assert.ok(
    guestOrders.some((item) => item.id === order.id),
    'el pedido creado debe sobrevivir una recarga desde el servicio',
  );

  const cancelledOrder = await assertServiceCall('orderService.cancelOrder', () =>
    orderService.cancelOrder(order.id, 'GST-002'),
  );
  assert.equal(cancelledOrder.status, 'cancelled');
  await assert.rejects(
    () => orderService.cancelOrder('ORD-001', 'GST-002'),
    /no pertenece/,
    'un huesped no debe cancelar pedidos de otra reserva',
  );

  const request = await assertServiceCall('serviceRequestService.createRequest', () =>
    serviceRequestService.createRequest({
      bookingId: 'BKG-002',
      roomId: 'RM-201',
      guestId: 'GST-002',
      type: 'housekeeping',
      description: 'Toallas extra',
    }),
  );
  assert.equal(request.status, 'pending');
  assert.equal(request.guestId, 'GST-002');

  const guestRequests = await serviceRequestService.getRequestsByGuestId('GST-002');
  assert.ok(
    guestRequests.some((item) => item.id === request.id),
    'la solicitud creada debe sobrevivir una recarga desde el servicio',
  );

  const cancelledRequest = await assertServiceCall('serviceRequestService.cancelRequest', () =>
    serviceRequestService.cancelRequest(request.id, 'GST-002'),
  );
  assert.equal(cancelledRequest.status, 'rejected');
  await assert.rejects(
    () => serviceRequestService.cancelRequest('SR-001', 'GST-002'),
    /no pertenece/,
    'un huesped no debe cancelar solicitudes de otra reserva',
  );

  const updatedGuest = await assertServiceCall('guestService.updateGuest portal', () =>
    guestService.updateGuest('GST-002', {
      phone: '+502 5555-7272',
      nationality: 'Guatemalteca',
    }),
  );
  assert.equal(updatedGuest.phone, '+502 5555-7272');
  assert.equal((await guestService.getGuestById('GST-002')).phone, '+502 5555-7272');

  const notifications = await notificationService.getNotificationsByGuestId('GST-002');
  assert.ok(notifications.length > 0);
  const unread = notifications.find((item) => !item.read) ?? notifications[0];
  const marked = await notificationService.markNotificationRead('GST-002', unread.id);
  assert.equal(marked.read, true);
  assert.ok(
    notificationReadsDB.some(
      (item) => item.guest_id === 'GST-002' && item.notification_id === unread.id,
    ),
    'la marca de lectura debe persistir en notificationReadsDB',
  );
  const reloaded = await notificationService.getNotificationsByGuestId('GST-002');
  assert.equal(
    reloaded.find((item) => item.id === unread.id)?.read,
    true,
    'la marca de lectura debe sobrevivir una recarga desde notificationService',
  );

  const beforeMarkAllCount = notificationReadsDB.filter(
    (item) => item.guest_id === 'GST-002',
  ).length;
  await notificationService.markAllRead('GST-002');
  const afterMarkAll = await notificationService.getNotificationsByGuestId('GST-002');
  assert.ok(afterMarkAll.every((item) => item.read));
  assert.ok(
    notificationReadsDB.filter((item) => item.guest_id === 'GST-002').length >= beforeMarkAllCount,
    'markAllRead debe conservar las marcas en notificationReadsDB',
  );
});

test('room service y conserjeria persisten estados, motivos, observaciones y cargos reales', async () => {
  const beforeCharges = await guestAccountService.getChargesByBookingId('BKG-002');
  const deliveredOrder = await assertServiceCall('orderService.createOrder room-service', () =>
    orderService.createOrder({
      bookingId: 'BKG-002',
      roomId: 'RM-201',
      guestId: 'GST-002',
      items: [{ productId: 'PRD-001', quantity: 1 }],
      notes: 'Subir con cubiertos.',
    }),
  );

  await orderService.updateOrderStatus(deliveredOrder.id, 'accepted');
  await orderService.updateOrderStatus(deliveredOrder.id, 'preparing');
  await orderService.updateOrderStatus(deliveredOrder.id, 'ready');
  await orderService.updateOrderStatus(deliveredOrder.id, 'onTheWay');
  const delivered = await orderService.updateOrderStatus(deliveredOrder.id, 'delivered');
  assert.equal(delivered.status, 'delivered');
  assert.ok(delivered.chargeId, 'un pedido entregado debe guardar el chargeId real');

  const afterDeliveryCharges = await guestAccountService.getChargesByBookingId('BKG-002');
  assert.equal(
    afterDeliveryCharges.length,
    beforeCharges.length + 1,
    'entregar un pedido debe crear exactamente un cargo',
  );
  assert.ok(
    afterDeliveryCharges.some((charge) => charge.id === delivered.chargeId),
    'el cargo creado debe existir en el folio real de la reserva',
  );
  assert.equal(
    afterDeliveryCharges.find((charge) => charge.id === delivered.chargeId)?.createdByUserId,
    undefined,
    'un cargo automatico sin usuario operativo no debe inventar createdByUserId',
  );

  const deliveredAgain = await orderService.updateOrderStatus(deliveredOrder.id, 'delivered');
  assert.equal(deliveredAgain.chargeId, delivered.chargeId);
  assert.equal(
    (await guestAccountService.getChargesByBookingId('BKG-002')).length,
    afterDeliveryCharges.length,
    'reintentar el mismo estado entregado no debe duplicar cargos',
  );

  const staffOrder = await orderService.createOrder({
    bookingId: 'BKG-002',
    roomId: 'RM-201',
    guestId: 'GST-002',
    items: [{ productId: 'PRD-004', quantity: 1 }],
  });
  await orderService.updateOrderStatus(staffOrder.id, 'accepted');
  await orderService.updateOrderStatus(staffOrder.id, 'preparing');
  await orderService.updateOrderStatus(staffOrder.id, 'ready');
  await orderService.updateOrderStatus(staffOrder.id, 'onTheWay');
  const staffDelivered = await orderService.updateOrderStatus(
    staffOrder.id,
    'delivered',
    undefined,
    { createdByUserId: 'USR-008' },
  );
  const afterStaffDeliveryCharges = await guestAccountService.getChargesByBookingId('BKG-002');
  assert.equal(
    afterStaffDeliveryCharges.find((charge) => charge.id === staffDelivered.chargeId)
      ?.createdByUserId,
    'USR-008',
    'si el caller envia un usuario operativo real, el cargo debe conservarlo',
  );
  const invalidCreatorOrder = await orderService.createOrder({
    bookingId: 'BKG-002',
    roomId: 'RM-201',
    guestId: 'GST-002',
    items: [{ productId: 'PRD-004', quantity: 1 }],
  });
  await orderService.updateOrderStatus(invalidCreatorOrder.id, 'accepted');
  await orderService.updateOrderStatus(invalidCreatorOrder.id, 'preparing');
  await orderService.updateOrderStatus(invalidCreatorOrder.id, 'ready');
  await orderService.updateOrderStatus(invalidCreatorOrder.id, 'onTheWay');
  await assert.rejects(
    () =>
      orderService.updateOrderStatus(invalidCreatorOrder.id, 'delivered', undefined, {
        createdByUserId: 'user-room-service',
      }),
    /usuario operativo/,
    'no debe guardar IDs de sesion como creador de cargos',
  );

  const rejectedOrder = await orderService.createOrder({
    bookingId: 'BKG-002',
    roomId: 'RM-201',
    guestId: 'GST-002',
    items: [{ productId: 'PRD-007', quantity: 1 }],
  });
  const rejected = await orderService.updateOrderStatus(
    rejectedOrder.id,
    'rejected',
    'Producto agotado.',
  );
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.notes, 'Producto agotado.');
  assert.equal(rejected.chargeId, undefined);

  const cancelledOrder = await orderService.createOrder({
    bookingId: 'BKG-002',
    roomId: 'RM-201',
    guestId: 'GST-002',
    items: [{ productId: 'PRD-009', quantity: 1 }],
  });
  const noted = await orderService.updateOrderNotes(cancelledOrder.id, 'Cancelar por llamada.');
  const cancelled = await orderService.cancelOrder(cancelledOrder.id);
  assert.equal(noted.notes, 'Cancelar por llamada.');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.chargeId, undefined);
  assert.equal(
    (await guestAccountService.getChargesByBookingId('BKG-002')).length,
    afterStaffDeliveryCharges.length,
    'pedidos rechazados o cancelados no deben crear cargos',
  );

  const concierge = await serviceRequestService.createRequest({
    bookingId: 'BKG-002',
    roomId: 'RM-201',
    guestId: 'GST-002',
    type: 'concierge',
    description: 'Reservar cena',
  });
  const conciergeAccepted = await serviceRequestService.updateRequestStatus(
    concierge.id,
    'accepted',
  );
  assert.equal(conciergeAccepted.status, 'accepted');
  const observed = await serviceRequestService.updateRequestNotes(
    concierge.id,
    'Mesa junto a ventana.',
  );
  assert.equal(observed.notes, 'Mesa junto a ventana.');
  const inProgress = await serviceRequestService.updateRequestStatus(concierge.id, 'inProgress');
  assert.equal(inProgress.status, 'inProgress');
  const completed = await serviceRequestService.updateRequestStatus(concierge.id, 'completed');
  assert.equal(completed.status, 'completed');

  const rejectedConcierge = await serviceRequestService.createRequest({
    bookingId: 'BKG-002',
    roomId: 'RM-201',
    guestId: 'GST-002',
    type: 'concierge',
    description: 'Traslado privado',
  });
  const conciergeRejected = await serviceRequestService.updateRequestStatus(
    rejectedConcierge.id,
    'rejected',
    'Proveedor no disponible.',
  );
  assert.equal(conciergeRejected.status, 'rejected');
  assert.equal(conciergeRejected.notes, 'Proveedor no disponible.');
});
