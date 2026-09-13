import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { create, act } from 'react-test-renderer';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { router as configuredRouter } from '@/app/router';
import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { authService, sessionStorageKey } from '@/modules/auth/services/auth-service';
import { getLoginDestination } from '@/private/routes/navigation';
import { authService as sharedAuthService } from '@/services/authService';
import { mockUtils } from '@/services/mockUtils';
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
const wait = () => new Promise((resolve) => setTimeout(resolve, 650));
const text = () => JSON.stringify(view.toJSON());

beforeEach(() => {
  values.clear();
  globalThis.localStorage = storage;
  sharedAuthService.clearSession();
  mockUtils.setForceError(false);
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
  await login('recepcion@hotelboutique.test', 'incorrecta');
  assert.ok(text().includes('Correo o contraseña incorrectos.'));
  assert.equal(values.size, 0);
  await login(' RECEPCION@hotelboutique.test ');
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
    ['recepcion', 'Recepción', '/pms/users', 2],
    ['limpieza', 'Limpieza', '/pms/cash', 2],
    ['conserjeria', 'Conserjería', '/pms/housekeeping', 2],
    ['roomservice', 'Room Service', '/pms/concierge', 2],
    ['huesped', 'Panel operativo', '/pms/reception', 1],
    ['admin', 'Usuarios', null, 7],
  ];
  for (const [account, section, forbidden, count] of roles) {
    await login(`${account}@hotelboutique.test`);
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
  await login('limpieza@hotelboutique.test');
  act(() => view.unmount());
  router.dispose();
  await open('/pms/housekeeping');
  assert.equal(router.state.location.pathname, '/pms/housekeeping');
  assert.ok(text().includes('Maria Lopez'));
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

function storedSession(id = 'user-admin', expiresAt = Date.now() + 10000) {
  return JSON.stringify({
    user: { id, role: 'ADMIN' },
    token: 'mock-access-' + id,
    refreshToken: 'mock-refresh-' + id,
    expiresAt: new Date(expiresAt).toISOString(),
  });
}

test('expired, malformed and unknown sessions are cleared; persisted roles are ignored', async () => {
  for (const value of [
    '{',
    'null',
    storedSession('user-admin', Date.now() - 1),
    storedSession('missing'),
  ]) {
    storage.setItem(sessionStorageKey, value);
    assert.equal(await authService.restore(), null);
    assert.equal(values.size, 0);
  }
  storage.setItem(sessionStorageKey, storedSession('user-housekeeping'));
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
  storage.setItem(sessionStorageKey, storedSession('user-admin', Date.now() + 1100));
  await open('/pms');
  assert.ok(text().includes('Cerrar sesión'));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
  assert.equal(router.state.location.pathname, '/auth/login');
  assert.equal(values.size, 0);
});

test('session recovery failure offers a working retry', async () => {
  storage.setItem(sessionStorageKey, storedSession());

  try {
    mockUtils.setForceError(true);
    await open('/pms');
    assert.ok(text().includes('No se pudo recuperar la sesión'));
    mockUtils.setForceError(false);
    await act(async () => {
      await view.root.findByType('button').props.onClick();
    });
    assert.ok(text().includes('Cerrar sesión'));
  } finally {
    mockUtils.setForceError(false);
  }
});

test('shared service sets and clears the HTTP token, even when remote logout fails', async () => {
  const fetch = globalThis.fetch;
  const headers = [];
  globalThis.fetch = async (_url, init) => {
    headers.push(init.headers.get('Authorization'));
    return new Response(null, { status: 204 });
  };
  try {
    const session = await sharedAuthService.login('admin@hotelboutique.test', 'AuroraDemo2026!');
    await httpClient.get('/probe');
    assert.equal(headers.at(-1), `Bearer ${session.token}`);
    httpClient.clearToken();
    assert.equal((await sharedAuthService.getCurrentUser()).role, 'ADMIN');
    await httpClient.get('/probe');
    assert.equal(headers.at(-1), `Bearer ${session.token}`);
    mockUtils.setForceError(true);
    const logout = sharedAuthService.logout();
    assert.equal(values.size, 0);
    await httpClient.get('/probe');
    assert.equal(headers.at(-1), null);
    await assert.rejects(logout, /sesión local se cerró/);
  } finally {
    globalThis.fetch = fetch;
    mockUtils.setForceError(false);
  }
});

test('in-flight login cannot restore a session after cancellation or logout', async () => {
  const controller = new AbortController();
  const pending = sharedAuthService.login(
    'admin@hotelboutique.test',
    'AuroraDemo2026!',
    controller.signal,
  );
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(values.size, 0);
  const second = sharedAuthService.login('admin@hotelboutique.test', 'AuroraDemo2026!');
  sharedAuthService.clearSession();
  await assert.rejects(second, { name: 'AbortError' });
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
    sharedAuthService.login('unknown@hotelboutique.test', 'AuroraDemo2026!'),
    /Correo o contraseña incorrectos/,
  );
  assert.equal(values.size, 0);
});
