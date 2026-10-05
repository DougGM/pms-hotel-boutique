import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { create, act } from 'react-test-renderer';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { router as configuredRouter } from '@/app/router';
import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { authService, sessionStorageKey } from '@/modules/auth/services/auth-service';
import { getLoginDestination } from '@/private/routes/navigation';
import { authService as sharedAuthService } from '@/services/authService';
import { httpClient } from '@/services/http-client';

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
globalThis.localStorage = storage;
globalThis.window = Object.assign(new EventTarget(), {
  setTimeout: (callback, delay) => setTimeout(callback, delay).unref(),
  clearTimeout,
  location: { search: '' },
});

let view;
let router;
let originalFetch;
let requests;
let failNextRefresh;
const wait = () => new Promise((resolve) => setTimeout(resolve, 650));
const text = () => JSON.stringify(view.toJSON());
const password = 'AuroraDemo2026!';

const accounts = {
  'admin@hotelboutique.test': ['ROLE_ADMIN', 'bookings.read', 'rooms.write', 'cash.read'],
  'huesped@hotelboutique.test': ['ROLE_GUEST'],
  'recepcion@hotelboutique.test': [
    'ROLE_RECEPTION',
    'bookings.read',
    'bookings.write',
    'bookings.check-in',
  ],
  'limpieza@hotelboutique.test': ['ROLE_HOUSEKEEPING', 'housekeeping.read'],
  'conserjeria@hotelboutique.test': ['ROLE_CONCIERGE', 'concierge.read'],
  'roomservice@hotelboutique.test': ['ROLE_ROOM_SERVICE', 'room-service.read'],
};

function encodeBase64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function jwt(email, authorities, expiresIn = 60) {
  const now = Math.floor(Date.now() / 1000);
  return [
    encodeBase64Url({ alg: 'HS256', typ: 'JWT' }),
    encodeBase64Url({
      sub: email,
      authorities,
      type: 'staff',
      iat: now,
      exp: now + expiresIn,
    }),
    'signature',
  ].join('.');
}

// INT-12: el huésped canjea el código de su reserva por un JWT `type: guest`.
const GUEST_CODE = 'GL-2026-0001';
const GUEST_BOOKING_ID = '9f8e7d6c-0000-4000-8000-000000000001';
const API_NOW = '2026-10-04T12:00:00.000Z';
let guestTokenSeconds = 60;

const apiRoomFeatures = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Wi-Fi',
    description: 'Internet de alta velocidad',
    active: true,
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

const apiRoomTypes = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    code: 'STD',
    name: 'Estándar',
    description: 'Habitación estándar',
    capacity: 2,
    bedConfiguration: '1 cama queen',
    roomFeatureIds: [apiRoomFeatures[0].id],
    active: true,
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

const apiRooms = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    roomNumber: '101',
    roomTypeId: apiRoomTypes[0].id,
    floor: 1,
    status: 'available',
    housekeepingStatus: 'clean',
    notes: 'Lista para pruebas de auth',
    updatedAt: API_NOW,
    createdAt: API_NOW,
  },
];

const apiGuests = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    firstName: 'Elena',
    lastName: 'Castro',
    email: 'elena@example.com',
    phone: '+502 5555-1010',
    nationality: 'Guatemalteca',
    documentType: 'national_id',
    documentNumber: '1000 20000 0101',
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

const apiBookings = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    confirmationCode: 'PMS-AUTH-0001',
    guestLinkCode: 'GL-AUTH-0001',
    guestId: apiGuests[0].id,
    roomId: apiRooms[0].id,
    roomTypeId: apiRoomTypes[0].id,
    checkIn: '2026-10-04',
    checkOut: '2026-10-05',
    status: 'confirmed',
    adults: 1,
    children: 0,
    totalAmountCents: 90000,
    currency: 'GTQ',
    notes: 'Reserva mínima para workspace de auth',
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

const apiRoles = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    code: 'ADMIN',
    name: 'Administrador',
    active: true,
    permissions: ['bookings.read', 'rooms.write', 'cash.read'],
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    code: 'HOUSEKEEPING',
    name: 'Limpieza',
    active: true,
    permissions: ['housekeeping.read'],
  },
];

const apiUsers = Object.keys(accounts)
  .filter((email) => email !== 'huesped@hotelboutique.test')
  .map((email, index) => ({
    id: `70000000-0000-4000-8000-00000000000${index + 1}`,
    firstName: email.split('@')[0],
    lastName: 'Prueba',
    email,
    roleCode: accounts[email][0].replace('ROLE_', ''),
    status: 'active',
    createdAt: API_NOW,
    updatedAt: API_NOW,
  }));

const apiProducts = [
  {
    id: '80000000-0000-4000-8000-000000000001',
    sku: 'CAFE',
    name: 'Café',
    description: 'Café de cortesía',
    category: 'food_and_beverage',
    priceCents: 2500,
    currency: 'GTQ',
    active: true,
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

const apiAmenities = [
  {
    id: '90000000-0000-4000-8000-000000000001',
    name: 'Spa',
    description: 'Spa del hotel',
    category: 'wellness',
    location: 'Nivel 1',
    opensAt: '09:00',
    closesAt: '18:00',
    active: true,
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

const apiInventoryItems = [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    sku: 'INV-CAFE',
    name: 'Café',
    description: 'Inventario de café',
    category: 'room_service',
    unit: 'unit',
    currentQuantity: 12,
    minimumQuantity: 4,
    lowStock: false,
    productId: apiProducts[0].id,
    active: true,
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

const apiPromotions = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    code: 'AUTH10',
    name: 'Auth 10',
    description: 'Promoción de prueba',
    discountPercent: 10,
    validFrom: '2026-10-01',
    validTo: '2026-10-31',
    active: true,
    createdAt: API_NOW,
    updatedAt: API_NOW,
  },
];

function guestJwt(expiresIn) {
  const now = Math.floor(Date.now() / 1000);
  return [
    encodeBase64Url({ alg: 'HS256', typ: 'JWT' }),
    encodeBase64Url({
      sub: `guest:${GUEST_BOOKING_ID}`,
      authorities: ['ROLE_GUEST'],
      type: 'guest',
      iat: now,
      exp: now + expiresIn,
    }),
    'signature',
  ].join('.');
}

function authResponse(email, expiresIn = 60) {
  return {
    accessToken: jwt(email, accounts[email], expiresIn),
    refreshToken: `refresh:${email}:${Date.now()}`,
    tokenType: 'Bearer',
    expiresIn,
  };
}

function json(data, status = 200, statusText = status === 200 ? 'OK' : 'Error') {
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

function decodeAuth(init) {
  const header = init?.headers?.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const [, payload] = header.slice('Bearer '.length).split('.');
  return JSON.parse(
    Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
  );
}

function installFetch() {
  requests = [];
  failNextRefresh = false;
  guestTokenSeconds = 60;
  globalThis.fetch = async (url, init = {}) => {
    const path = new URL(String(url)).pathname;
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ path, body, authorization: init.headers?.get('Authorization') ?? null });

    if (path === '/api/v1/auth/login') {
      const email = String(body.email ?? '')
        .trim()
        .toLowerCase();
      if (!accounts[email] || body.password !== password) {
        return json({ message: 'Correo o contraseña incorrectos.' }, 401, 'Unauthorized');
      }
      return json(authResponse(email));
    }
    if (path === '/api/v1/auth/refresh') {
      if (failNextRefresh) return json({ message: 'Refresh token inválido.' }, 401, 'Unauthorized');
      const email = String(body.refreshToken ?? '').split(':')[1];
      if (!accounts[email])
        return json({ message: 'Refresh token inválido.' }, 401, 'Unauthorized');
      return json(authResponse(email));
    }
    if (path === '/api/v1/auth/logout') return new Response(null, { status: 204 });
    if (path === '/api/v1/guest/auth/link') {
      if (body?.code !== GUEST_CODE) {
        return json({ message: 'Guest link code not found' }, 400, 'Bad Request');
      }
      return json({
        accessToken: guestJwt(guestTokenSeconds),
        tokenType: 'Bearer',
        expiresIn: guestTokenSeconds,
      });
    }
    if (path.startsWith('/api/v1/guest/')) {
      const payload = decodeAuth(init);
      if (payload?.type !== 'guest') return json({ message: 'Forbidden' }, 403, 'Forbidden');
      if (path === '/api/v1/guest/stay') {
        return json({
          bookingId: GUEST_BOOKING_ID,
          guestId: '1a2b3c4d-0000-4000-8000-000000000001',
          guestFirstName: 'Ana',
          guestLastName: 'López',
          roomId: '2b3c4d5e-0000-4000-8000-000000000001',
          roomNumber: '305',
          roomTypeId: '3c4d5e6f-0000-4000-8000-000000000001',
          roomTypeName: 'Suite Jardín',
          checkIn: '2026-10-03',
          checkOut: '2026-10-06',
          status: 'checked_in',
          balanceCents: 45000,
          currency: 'GTQ',
        });
      }
      if (path === '/api/v1/guest/notifications/unread-count') return json({ unreadCount: 0 });
      return json([]);
    }
    // El workspace de Limpieza carga su cola desde el backend (INT-09).
    if (path === '/api/v1/rooms') return json(apiRooms);
    if (path.startsWith('/api/v1/rooms/')) {
      const id = path.split('/').at(-1);
      const room = apiRooms.find((item) => item.id === id);
      return room ? json(room) : json({ message: 'No encontrado.' }, 404, 'Not Found');
    }
    if (path === '/api/v1/room-types') return json(apiRoomTypes);
    if (path.startsWith('/api/v1/room-types/')) {
      const id = path.split('/').at(-1);
      const roomType = apiRoomTypes.find((item) => item.id === id);
      return roomType ? json(roomType) : json({ message: 'No encontrado.' }, 404, 'Not Found');
    }
    if (path === '/api/v1/room-features') return json(apiRoomFeatures);
    if (path === '/api/v1/bookings') return json(apiBookings);
    if (path.startsWith('/api/v1/bookings/')) {
      const id = path.split('/').at(-1);
      const booking = apiBookings.find((item) => item.id === id);
      return booking ? json(booking) : json({ message: 'No encontrado.' }, 404, 'Not Found');
    }
    if (path === '/api/v1/guests') return json(apiGuests);
    if (path.startsWith('/api/v1/guests/')) {
      const id = path.split('/').at(-1);
      const guest = apiGuests.find((item) => item.id === id);
      return guest ? json(guest) : json({ message: 'No encontrado.' }, 404, 'Not Found');
    }
    if (
      path === '/api/v1/housekeeping/rooms' ||
      path === '/api/v1/housekeeping/rooms/stayover-cleanings'
    ) {
      return json(path === '/api/v1/housekeeping/rooms' ? apiRooms : []);
    }
    // El workspace de Room Service carga catálogo y pedidos desde el backend (INT-10).
    if (path === '/api/v1/room-service/products') return json(apiProducts);
    if (path === '/api/v1/room-service/orders') {
      return json([]);
    }
    if (path === '/api/v1/admin/audit-logs') return json([]);
    if (path === '/api/v1/admin/users') return json(apiUsers);
    if (path === '/api/v1/admin/roles') return json(apiRoles);
    if (path === '/api/v1/admin/promotions') return json(apiPromotions);
    if (path === '/api/v1/admin/amenities') return json(apiAmenities);
    if (path === '/api/v1/admin/room-service/products') return json(apiProducts);
    if (path === '/api/v1/inventory/items') return json(apiInventoryItems);
    if (path.startsWith('/api/v1/inventory/items/') && path.endsWith('/movements')) {
      return json([]);
    }
    // El workspace de Conserjería carga sus solicitudes desde el backend (INT-11).
    if (path === '/api/v1/concierge/requests') return json([]);
    if (path === '/api/v1/probe') {
      const payload = decodeAuth(init);
      if (!payload) return json({ message: 'Unauthorized' }, 401, 'Unauthorized');
      return json({ ok: true, subject: payload.sub });
    }
    if (path === '/api/v1/protected-once') {
      const count = requests.filter((request) => request.path === path).length;
      if (count === 1) return json({ message: 'Token vencido.' }, 401, 'Unauthorized');
      return json({ ok: true });
    }
    return json({ message: 'No encontrado.' }, 404, 'Not Found');
  };
}

beforeEach(() => {
  values.clear();
  globalThis.localStorage = storage;
  originalFetch = globalThis.fetch;
  installFetch();
  sharedAuthService.clearSession();
});

afterEach(() => {
  if (view) act(() => view.unmount());
  router?.dispose();
  view = undefined;
  globalThis.fetch = originalFetch;
});

async function open(path) {
  router = createMemoryRouter(configuredRouter.routes, { initialEntries: [path] });
  await act(async () => {
    view = create(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    );
    await wait();
  });
}

async function login(email, nextPassword = password) {
  act(() => {
    view.root.findByProps({ id: 'staff-email' }).props.onChange({ target: { value: email } });
    view.root
      .findByProps({ id: 'staff-password' })
      .props.onChange({ target: { value: nextPassword } });
  });
  await act(async () => {
    await view.root.findByType('form').props.onSubmit({ preventDefault() {} });
    await wait();
  });
}

async function logoutFromWorkspace() {
  const profileButtons = view.root.findAllByProps({ className: 'profile-button' });
  if (profileButtons.length === 0) {
    await act(async () => {
      view.root
        .findAllByType('button')
        .find((button) => JSON.stringify(button.children).includes('Cerrar sesión'))
        .props.onClick();
    });
    return;
  }
  await act(async () => {
    profileButtons[0].props.onClick();
  });
  await act(async () => {
    view.root.findByProps({ className: 'logout' }).props.onClick();
  });
}

test('all private entries, including unknown nested URLs, redirect guests to login', async () => {
  await open('/pms');
  assert.equal(router.state.location.pathname, '/auth/login');
  for (const path of [
    '/pms/dashboard',
    '/pms/reception',
    '/pms/reception/no-existe',
    '/pms/no-existe',
  ]) {
    await act(async () => {
      await router.navigate(path);
    });
    assert.equal(router.state.location.pathname, '/auth/login');
    assert.equal(router.state.location.state.from, path);
    assert.ok(!text().includes('Cerrar sesión'));
  }
});

test('wrong credentials show an error, retry succeeds, and intended URL is restored', async () => {
  await open('/pms/reception?day=today#calendar');
  await login('recepcion@hotelboutique.test', 'incorrecta');
  assert.ok(text().includes('Correo o contraseña incorrectos.'));
  assert.equal(values.size, 0);
  await login(' RECEPCION@hotelboutique.test ');
  assert.equal(router.state.location.pathname, '/pms/reception');
  assert.equal(router.state.location.search, '?day=today');
  assert.equal(router.state.location.hash, '#calendar');
  assert.ok(text().includes('Recepcion'));
  assert.ok(!values.get(sessionStorageKey).includes(password));
  assert.ok(!values.get(sessionStorageKey).includes('permissions'));
});

test('each staff role only sees its menu and direct unauthorized URLs are blocked', async () => {
  await open('/login');
  const roles = [
    ['recepcion', '/pms/reception', 'Recepción', '/pms/users', 3],
    ['limpieza', '/pms/housekeeping', 'Habitaciones', '/pms/cash', 4],
    ['conserjeria', '/pms/concierge', 'Solicitudes', '/pms/cash', 3],
    ['roomservice', '/pms/room-service', 'Pedidos activos', '/pms/users', 4],
    // 49: el grupo Huésped suma 'Notificaciones' (INT-12).
    ['admin', '/pms/dashboard', 'Administración', null, 49],
  ];
  for (const [account, expectedPath, section, forbidden, count] of roles) {
    await login(`${account}@hotelboutique.test`);
    assert.equal(router.state.location.pathname, expectedPath, account);
    const nav = view.root.findByType('nav');
    const labels = nav
      .findAllByType('button')
      .map((button) => button.findByType('span').children.join(''));
    assert.ok(labels.includes(section), account);
    assert.equal(labels.length, count, account);
    if (forbidden) {
      await act(async () => {
        await router.navigate(`${forbidden}/no-existe`);
      });
      assert.ok(text().includes('No tienes permiso para ver esta sección'), account);
    }
    await logoutFromWorkspace();
    assert.equal(router.state.location.pathname, '/auth/login');
    assert.equal(values.size, 0);
  }
});

test('session survives remount; logout in another tab clears access', async () => {
  await open('/auth/login');
  await login('limpieza@hotelboutique.test');
  act(() => view.unmount());
  router.dispose();
  await open('/pms/housekeeping');
  await act(async () => {
    await wait();
  });
  assert.equal(router.state.location.pathname, '/pms/housekeeping');
  assert.ok(text().includes('Limpieza'));
  storage.removeItem(sessionStorageKey);
  await act(async () => {
    window.dispatchEvent(Object.assign(new Event('storage'), { key: sessionStorageKey }));
    await wait();
  });
  assert.equal(router.state.location.pathname, '/auth/login');
});

test('public and private 404 pages remain scoped to their layouts', async () => {
  await open('/no-existe');
  assert.ok(text().includes('Error 404'));
  assert.equal(view.root.findAllByType('nav').length, 1);
  await act(async () => {
    await router.navigate('/auth/login');
  });
  await login('admin@hotelboutique.test');
  for (const path of ['/pms/no-existe', '/pms/reception/no-existe']) {
    await act(async () => {
      await router.navigate(path);
    });
    assert.ok(text().includes('Error 404'));
    assert.equal(view.root.findAllByType('nav').length, 1);
  }
});

function storedSession(
  email = 'admin@hotelboutique.test',
  expiresAt = Date.now() + 10000,
  accessExpiresIn = 60,
) {
  const response = authResponse(email, accessExpiresIn);
  return JSON.stringify({
    user: {
      id: email,
      email,
      name: email,
      role: 'ADMIN',
      createdAt: new Date().toISOString(),
    },
    token: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: new Date(expiresAt).toISOString(),
    tokenType: 'Bearer',
    authorities: accounts[email],
  });
}

test('expired, malformed and unknown sessions are cleared; persisted roles are ignored', async () => {
  for (const value of ['{', 'null', storedSession('admin@hotelboutique.test', Date.now() - 1)]) {
    storage.setItem(sessionStorageKey, value);
    assert.equal(await authService.restore(), null);
    assert.equal(values.size, 0);
  }
  storage.setItem(sessionStorageKey, storedSession('limpieza@hotelboutique.test'));
  const session = await authService.restore();
  assert.equal(session.role, 'HOUSEKEEPING');
  assert.deepEqual(session.permissions, ['dashboard:view', 'housekeeping:view']);
  assert.ok(session.expiresAt instanceof Date);
});

test('storage failure is surfaced without granting a nonpersistent session', async () => {
  await open('/auth/login');
  globalThis.localStorage = {
    ...storage,
    setItem() {
      throw new Error('Storage disabled');
    },
  };
  await login('admin@hotelboutique.test');
  assert.ok(text().includes('No se pudo guardar la sesión'));
  assert.equal(router.state.location.pathname, '/auth/login');
});

test('return URL cannot redirect to another origin or a non-private page', () => {
  for (const from of [
    'https://evil.test/pms',
    '//evil.test/pms',
    '/pms/../../outside',
    '/pms\\evil',
    '/',
    null,
    {},
  ]) {
    assert.equal(getLoginDestination(from), '/pms/dashboard');
  }
  assert.equal(getLoginDestination('/pms/reception?x=1#today'), '/pms/reception?x=1#today');
});

test('session expiration removes persisted credentials and redirects the mounted app', async () => {
  storage.setItem(sessionStorageKey, storedSession('admin@hotelboutique.test', Date.now() + 1100));
  await open('/pms');
  assert.ok(text().includes('Admin'));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
  assert.equal(router.state.location.pathname, '/auth/login');
  assert.equal(values.size, 0);
});

test('shared service sets Bearer, refreshes once, retries, and clears on refresh failure', async () => {
  const session = await sharedAuthService.login('admin@hotelboutique.test', password);
  await httpClient.get('/probe');
  assert.equal(requests.at(-1).authorization, `Bearer ${session.token}`);

  await httpClient.get('/protected-once');
  assert.equal(requests.filter((request) => request.path === '/api/v1/protected-once').length, 2);
  assert.equal(requests.filter((request) => request.path === '/api/v1/auth/refresh').length, 1);

  failNextRefresh = true;
  requests = [];
  await assert.rejects(httpClient.get('/protected-once'), /HTTP 401/);
  assert.equal(values.size, 0);
});

test('restore refreshes an expired access token before granting the stored session', async () => {
  storage.setItem(
    sessionStorageKey,
    storedSession('admin@hotelboutique.test', Date.now() + 60_000, -5),
  );

  const session = await sharedAuthService.getCurrentSession();
  assert.equal(session.user.email, 'admin@hotelboutique.test');
  assert.equal(requests.filter((request) => request.path === '/api/v1/auth/refresh').length, 1);

  await httpClient.get('/probe');
  assert.equal(requests.at(-1).authorization, `Bearer ${session.token}`);
});

test('restore clears the stored session when preventive refresh fails', async () => {
  storage.setItem(
    sessionStorageKey,
    storedSession('admin@hotelboutique.test', Date.now() + 60_000, -5),
  );
  failNextRefresh = true;

  assert.equal(await sharedAuthService.getCurrentSession(), null);
  assert.equal(requests.filter((request) => request.path === '/api/v1/auth/refresh').length, 1);
  assert.equal(values.size, 0);
});

test('logout posts the refresh token and always removes the local session', async () => {
  const session = await sharedAuthService.login('admin@hotelboutique.test', password);
  await sharedAuthService.logout();
  const logout = requests.find((request) => request.path === '/api/v1/auth/logout');
  assert.equal(logout.body.refreshToken, session.refreshToken);
  assert.equal(values.size, 0);
  await httpClient.get('/probe').catch(() => undefined);
  assert.equal(requests.at(-1).authorization, null);
});

test('in-flight login cannot restore a session after cancellation or logout', async () => {
  const controller = new AbortController();
  const pending = sharedAuthService.login('admin@hotelboutique.test', password, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(values.size, 0);
});

test('old isolated WEB-06 sessions are removed rather than granted new permissions', async () => {
  storage.setItem(
    'hotel-aurora.auth.v1',
    JSON.stringify({ version: 1, userId: 'demo-admin', expiresAt: Date.now() + 10000 }),
  );
  assert.equal(await sharedAuthService.getCurrentSession(), null);
  assert.equal(values.size, 0);
});

test('shared service rejects wrong passwords and unknown email addresses', async () => {
  await assert.rejects(
    sharedAuthService.login('admin@hotelboutique.test', 'wrong'),
    /Correo o contraseña incorrectos/,
  );
  await assert.rejects(
    sharedAuthService.login('unknown@hotelboutique.test', password),
    /Correo o contraseña incorrectos/,
  );
  assert.equal(values.size, 0);
});

async function linkGuest(code) {
  act(() => {
    view.root.findByProps({ id: 'guest-link-code' }).props.onChange({ target: { value: code } });
  });
  await act(async () => {
    await view.root.findByType('form').props.onSubmit({ preventDefault() {} });
    await wait();
  });
}

test('el login del personal rechaza cuentas de huésped', async () => {
  await open('/auth/login');
  await login('huesped@hotelboutique.test');
  assert.equal(router.state.location.pathname, '/auth/login');
  assert.ok(text().includes('código de su reserva'), 'indica usar el acceso de huésped');
  assert.equal(values.size, 0, 'no persiste ninguna sesión');
});

test('el huésped entra con el código de su reserva y sale a su acceso', async () => {
  await open('/auth/register');
  assert.ok(text().includes('Acceso de huésped'));
  await linkGuest(GUEST_CODE);

  assert.equal(router.state.location.pathname, '/pms/dashboard');
  const labels = view.root
    .findByType('nav')
    .findAllByType('button')
    .map((button) => button.findByType('span').children.join(''));
  assert.ok(labels.includes('Room service'));
  assert.ok(labels.includes('Notificaciones'));
  assert.equal(labels.length, 8);
  assert.ok(requests.some((request) => request.path === '/api/v1/guest/auth/link'));
  assert.ok(!requests.some((request) => request.path === '/api/v1/auth/login'));
  assert.ok(
    requests
      .filter(
        (request) =>
          request.path.startsWith('/api/v1/guest/') && request.path !== '/api/v1/guest/auth/link',
      )
      .every((request) => request.authorization?.startsWith('Bearer ')),
    'todas las rutas /guest viajan con el JWT de huésped',
  );
  assert.ok(
    !requests.some((request) => /^\/api\/v1\/(bookings|guests|rooms|admin)/.test(request.path)),
    'el portal no consume endpoints del personal',
  );
  const stored = JSON.parse(values.get('PMS_AUTH_SESSION'));
  assert.equal(stored.user.role, 'GUEST');
  assert.equal(stored.user.name, 'Ana López');
  assert.equal(stored.refreshToken, '', 'el huésped no tiene refresh token');

  await logoutFromWorkspace();
  assert.equal(router.state.location.pathname, '/auth/register');
  assert.equal(values.has('PMS_AUTH_SESSION'), false);
});

test('un código inválido muestra el error y no crea sesión', async () => {
  await open('/auth/register');
  await linkGuest('NO-EXISTE');
  assert.equal(router.state.location.pathname, '/auth/register');
  assert.ok(text().includes('El código no es válido'));
  assert.equal(values.has('PMS_AUTH_SESSION'), false);
});

test('al vencer el token del huésped se le pide de nuevo el código', async () => {
  guestTokenSeconds = 2;
  await open('/auth/register');
  await linkGuest(GUEST_CODE);
  assert.equal(router.state.location.pathname, '/pms/dashboard');

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
  });
  assert.equal(router.state.location.pathname, '/auth/register');
  assert.ok(text().includes('Tu acceso venció'));
});
