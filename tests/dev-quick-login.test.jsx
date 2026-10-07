import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { act, create } from 'react-test-renderer';
import DevQuickLogin from '@/public/pages/DevQuickLogin';

// Accesos rápidos del login, solo en desarrollo. Que no lleguen al build de
// producción lo verifica scripts/test-dev-quick-login.mjs compilando
// StaffLoginPage con `import.meta.env.DEV = false`.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let view;
afterEach(() => {
  if (view) act(() => view.unmount());
  view = undefined;
});

const accountButtons = () =>
  view.root.findAll(
    (node) => node.type === 'button' && node.props.className === 'dev-quick-login__account',
  );

test('lista las cuentas demo de personal y huéspedes, con aviso de estancias vencidas', () => {
  act(() => {
    view = create(<DevQuickLogin onPick={() => undefined} />);
  });

  const labels = accountButtons().map((button) => button.props['aria-label']);
  assert.deepEqual(labels, [
    'Iniciar sesión como Administración (admin@aurora.test)',
    'Iniciar sesión como Recepción (recepcion@aurora.test)',
    'Iniciar sesión como Limpieza (limpieza@aurora.test)',
    'Iniciar sesión como Conserjería (conserjeria@aurora.test)',
    'Iniciar sesión como Room Service (roomservice@aurora.test)',
    'Iniciar sesión como Ana Morales (ana.demo@aurora.test)',
    'Iniciar sesión como Carlos Reyes (carlos.demo@aurora.test)',
  ]);
  const content = JSON.stringify(view.toJSON());
  assert.ok(content.includes('Solo en desarrollo'));
  assert.ok(content.includes('pueden estar vencidas'));
});

test('un clic entrega la cuenta elegida con su contraseña del seed', () => {
  const picked = [];
  act(() => {
    view = create(<DevQuickLogin onPick={(account) => picked.push(account)} />);
  });

  act(() => accountButtons()[1].props.onClick());
  act(() => accountButtons()[6].props.onClick());

  assert.deepEqual(
    picked.map(({ email, password, group }) => ({ email, password, group })),
    [
      { email: 'recepcion@aurora.test', password: 'recepcion', group: 'staff' },
      { email: 'carlos.demo@aurora.test', password: 'huesped2', group: 'guest' },
    ],
  );
});

test('mientras se inicia sesión los botones quedan deshabilitados', () => {
  act(() => {
    view = create(<DevQuickLogin onPick={() => undefined} disabled />);
  });

  assert.ok(accountButtons().every((button) => button.props.disabled === true));
});
