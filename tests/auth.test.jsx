import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { create, act } from 'react-test-renderer';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { router as configuredRouter } from '@/app/router';
import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { authService, sessionStorageKey } from '@/modules/auth/services/auth-service';
import { getLoginDestination } from '@/private/routes/navigation';
import { mockAuthAdapter } from '@/modules/auth/adapters/mock-auth';

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
});
let view;
let router;
const wait = () => new Promise((resolve) => setTimeout(resolve, 400));
const text = () => JSON.stringify(view.toJSON());

beforeEach(() => {
  values.clear();
  globalThis.localStorage = storage;
});
afterEach(() => {
  if (view) act(() => view.unmount());
  router?.dispose();
  view = undefined;
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

async function login(email, password = 'AuroraDemo2026!') {
  act(() => {
    view.root.findByProps({ id: 'staff-email' }).props.onChange({ target: { value: email } });
    view.root.findByProps({ id: 'staff-password' }).props.onChange({ target: { value: password } });
  });
  await act(async () => {
    await view.root.findByType('form').props.onSubmit({ preventDefault() {} });
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
  await login('recepcion@hotel.test', 'incorrecta');
  assert.ok(text().includes('Correo o contraseña incorrectos.'));
  assert.equal(values.size, 0);
  await login(' RECEPCION@hotel.test ');
  assert.equal(router.state.location.pathname, '/pms/reception');
  assert.equal(router.state.location.search, '?day=today');
  assert.equal(router.state.location.hash, '#calendar');
  assert.ok(text().includes('Cerrar sesión'));
  assert.ok(!values.get(sessionStorageKey).includes('AuroraDemo2026!'));
  assert.ok(!values.get(sessionStorageKey).includes('permissions'));
});

test('each staff role only sees its menu and direct unauthorized URLs are blocked', async () => {
  await open('/login');
  const roles = [
    ['recepcion', 'Recepción', '/pms/users'],
    ['limpieza', 'Limpieza', '/pms/reception'],
    ['roomservice', 'Room Service', '/pms/cash'],
    ['conserjeria', 'Conserjería', '/pms/housekeeping'],
    ['caja', 'Caja', '/pms/room-service'],
    ['admin', 'Usuarios', null],
  ];
  for (const [account, section, forbidden] of roles) {
    await login(`${account}@hotel.test`);
    const nav = view.root.findByType('nav');
    const labels = nav
      .findAllByType('button')
      .map((button) => button.findByType('span').children.join(''));
    assert.ok(labels.includes(section), account);
    assert.equal(labels.length, account === 'admin' ? 7 : 2, account);
    if (forbidden) {
      await act(async () => {
        await router.navigate(`${forbidden}/no-existe`);
      });
      assert.ok(text().includes('No tienes permiso para ver esta sección'), account);
    }
    await act(async () => {
      view.root
        .findAllByType('button')
        .find((button) => button.children.includes('Cerrar sesión'))
        .props.onClick();
    });
    assert.equal(router.state.location.pathname, '/auth/login');
    assert.equal(values.size, 0);
  }
});

test('session survives remount; logout in another tab clears access', async () => {
  await open('/auth/login');
  await login('limpieza@hotel.test');
  act(() => view.unmount());
  router.dispose();
  await open('/pms/housekeeping');
  assert.equal(router.state.location.pathname, '/pms/housekeeping');
  assert.ok(text().includes('María López'));
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
  assert.equal(view.root.findAllByType('nav').length, 0);
  await act(async () => {
    await router.navigate('/auth/login');
  });
  await login('admin@hotel.test');
  for (const path of ['/pms/no-existe', '/pms/reception/no-existe']) {
    await act(async () => {
      await router.navigate(path);
    });
    assert.ok(text().includes('Error 404'));
    assert.equal(view.root.findAllByType('nav').length, 1);
  }
});

test('expired, malformed and unknown sessions are cleared; persisted roles are ignored', async () => {
  for (const value of [
    '{',
    'null',
    JSON.stringify({ version: 1, userId: 'demo-admin', expiresAt: Date.now() - 1 }),
    JSON.stringify({ version: 1, userId: 'missing', expiresAt: Date.now() + 10000 }),
  ]) {
    storage.setItem(sessionStorageKey, value);
    assert.equal(await authService.restore(), null);
    assert.equal(values.size, 0);
  }
  storage.setItem(
    sessionStorageKey,
    JSON.stringify({
      version: 1,
      userId: 'demo-housekeeping',
      role: 'admin',
      permissions: ['users:view'],
      expiresAt: Date.now() + 10000,
    }),
  );
  const session = await authService.restore();
  assert.equal(session.role, 'housekeeping');
  assert.deepEqual(session.permissions, ['dashboard:view', 'housekeeping:view']);
});

test('storage failure is surfaced without granting a nonpersistent session', async () => {
  await open('/auth/login');
  globalThis.localStorage = {
    ...storage,
    setItem() {
      throw new Error('Storage disabled');
    },
  };
  await login('admin@hotel.test');
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
  storage.setItem(
    sessionStorageKey,
    JSON.stringify({ version: 1, userId: 'demo-admin', expiresAt: Date.now() + 900 }),
  );
  await open('/pms');
  assert.ok(text().includes('Cerrar sesión'));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
  assert.equal(router.state.location.pathname, '/auth/login');
  assert.equal(values.size, 0);
});

test('session recovery failure offers a working retry', async () => {
  storage.setItem(
    sessionStorageKey,
    JSON.stringify({ version: 1, userId: 'demo-admin', expiresAt: Date.now() + 10000 }),
  );
  const findUser = mockAuthAdapter.findUser;
  try {
    mockAuthAdapter.findUser = async () => {
      throw new Error('Simulated service failure');
    };
    await open('/pms');
    assert.ok(text().includes('No se pudo recuperar la sesión'));
    mockAuthAdapter.findUser = findUser;
    await act(async () => {
      await view.root.findByType('button').props.onClick();
    });
    assert.ok(text().includes('Cerrar sesión'));
  } finally {
    mockAuthAdapter.findUser = findUser;
  }
});
