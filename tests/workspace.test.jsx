import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { create, act } from 'react-test-renderer';
import { ReservationFormModal } from '@/modules/front-desk/components/workspace/ReceptionModals';
import { PrivateWorkspace } from '@/private/workspace/PrivateWorkspace';
import { serviceRequestService } from '@/services/serviceRequestService';
import { calculateNights } from '@/shared/utils/date';
import { toDomainCalendarDate } from '@/shared/types/common';

// Entorno mínimo para los servicios mock (mismo patrón que tests/auth.test.jsx).
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
globalThis.window = Object.assign(new EventTarget(), {
  setTimeout: (callback, delay) => setTimeout(callback, delay).unref(),
  clearTimeout,
  scrollY: 0,
  location: { search: '' },
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let view;
afterEach(() => {
  if (view) act(() => view.unmount());
  view = undefined;
});

const text = (node) =>
  typeof node === 'string' ? node : (node?.children ?? []).map(text).join('');
const hasClass = (node, name) =>
  typeof node.props?.className === 'string' && node.props.className.split(/\s+/).includes(name);
const buttons = (label, root = view.root) =>
  root.findAll((node) => node.type === 'button' && text(node).includes(label));
const settle = (ms = 700) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

// --- Recepción: ReservationFormModal ------------------------------------

const INVALID_RANGE =
  'Rango de fechas no válido. La fecha de salida debe ser posterior a la fecha de entrada.';
const rooms = [
  {
    id: 1,
    number: '101',
    floor: 'Piso 1',
    type: 'Estándar',
    capacity: 2,
    rate: 500,
    status: 'Disponible',
    features: [],
  },
];
// Igual que recNights en PrivateWorkspace: pasa por calculateNights, que lanza ante un rango inválido.
const nights = (checkIn, checkOut) =>
  Math.max(1, calculateNights(toDomainCalendarDate(checkIn), toDomainCalendarDate(checkOut)));

function renderReservationForm() {
  const saved = [];
  act(() => {
    view = create(
      <ReservationFormModal
        nextCode="AUR-TEST"
        rooms={rooms}
        hasConflict={() => false}
        isRoomBlocked={() => false}
        onSave={(reservation) => saved.push(reservation)}
        onClose={() => {}}
        nights={nights}
        folioTotals={() => ({ charges: 0, deposits: 0, payments: 0, balance: 0 })}
      />,
    );
  });
  return saved;
}
const dateInputs = () =>
  view.root.findAll((node) => node.type === 'input' && node.props.type === 'date');
const setDates = (checkIn, checkOut) => {
  const [checkInInput, checkOutInput] = dateInputs();
  act(() => checkInInput.props.onChange({ target: { value: checkIn } }));
  act(() => checkOutInput.props.onChange({ target: { value: checkOut } }));
};
const dateAlert = () =>
  view.root.findAll((node) => node.props.role === 'alert').map((node) => text(node));
const formIsOpen = () => text(view.root).includes('Crear reserva manual');
const ratePreview = () => view.root.findAll((node) => hasClass(node, 'rc-rate-preview'));
const fillGuestAndRoom = () => {
  const [name, lastName, phone] = view.root.findAll(
    (node) => node.type === 'input' && hasClass(node, 'rc-input') && node.props.type !== 'date',
  );
  act(() => name.props.onChange({ target: { value: 'Ana' } }));
  act(() => lastName.props.onChange({ target: { value: 'López' } }));
  act(() => phone.props.onChange({ target: { value: '5555-0000' } }));
  act(() => buttons('Hab. 101')[0].props.onClick());
};

for (const [label, checkIn, checkOut, message] of [
  ['salida anterior a la entrada', '2024-09-08', '2024-09-02', INVALID_RANGE],
  ['misma fecha de entrada y salida', '2024-09-08', '2024-09-08', INVALID_RANGE],
  ['fecha de salida vacía', '2024-09-08', '', 'Fechas obligatorias'],
  ['fecha de entrada vacía', '', '2024-09-08', 'Fechas obligatorias'],
]) {
  test(`reserva manual: ${label} muestra error inline sin tumbar la app ni guardar`, () => {
    const saved = renderReservationForm();
    fillGuestAndRoom();
    assert.doesNotThrow(() => setDates(checkIn, checkOut));
    assert.ok(formIsOpen(), 'el modal sigue abierto');
    assert.deepEqual(dateAlert(), [message]);
    assert.equal(ratePreview().length, 0, 'no calcula tarifa con noches inválidas');
    const summary = buttons('Ver resumen')[0];
    assert.equal(summary.props.disabled, true);
    act(() => summary.props.onClick());
    assert.ok(formIsOpen(), 'no avanza al resumen');
    assert.equal(saved.length, 0);
  });
}

test('reserva manual: al corregir las fechas se recupera el flujo y guarda 2 noches', () => {
  const saved = renderReservationForm();
  fillGuestAndRoom();
  setDates('2024-09-08', '2024-09-02');
  assert.deepEqual(dateAlert(), [INVALID_RANGE]);

  setDates('2024-08-31', '2024-09-02');
  assert.deepEqual(dateAlert(), []);
  assert.match(text(ratePreview()[0]), /× 2 noches/);
  const summary = buttons('Ver resumen')[0];
  assert.equal(summary.props.disabled, false);
  act(() => summary.props.onClick());
  assert.match(text(view.root), /2024-08-31 → 2024-09-02 · 2 noches/);

  act(() => buttons('Confirmar reserva')[0].props.onClick());
  assert.equal(saved.length, 1);
  assert.equal(saved[0].checkIn, '2024-08-31');
  assert.equal(saved[0].checkOut, '2024-09-02');
  assert.equal(saved[0].folio[0].concept, 'Alojamiento 2 noches');
  assert.equal(saved[0].folio[0].amount, 1000);
});

// --- Limpieza --------------------------------------------------------------

async function mountHousekeeping() {
  await act(async () => {
    view = create(<PrivateWorkspace role="housekeeping" sessionName="Limpieza Test" />);
  });
  for (let i = 0; i < 20 && !view.root.findAll((node) => hasClass(node, 'side-nav')).length; i++) {
    await settle(300);
  }
  assert.ok(view.root.findAll((node) => hasClass(node, 'side-nav')).length, 'workspace cargado');
}
const navItem = (label) =>
  view.root.find(
    (node) => node.type === 'button' && hasClass(node, 'nav-item') && text(node).startsWith(label),
  );
const navBadge = (label) =>
  navItem(label)
    .findAll((node) => node.type === 'b')
    .map(text)[0];
const goTo = async (label) => {
  await act(async () => navItem(label).props.onClick());
  await settle(100);
};
const headerHasDefectButton = () =>
  buttons(
    'Reportar desperfecto',
    view.root.find((node) => hasClass(node, 'welcome-row')),
  ).length > 0;
const requestRows = () =>
  view.root
    .findAll((node) => node.type === 'div' && hasClass(node, 'hk-req-row'))
    .map((row) => ({
      row,
      status: text(row.findAll((node) => hasClass(node, 'status-pill')).at(-1)),
      actions: row.findAll((node) => node.type === 'button').map(text),
    }));
const toasts = () => view.root.findAll((node) => hasClass(node, 'toast')).map(text);
const expectedOpenRequests = async () =>
  (await serviceRequestService.getRequests()).filter(
    (request) =>
      (request.type === 'housekeeping' || request.type === 'maintenance') &&
      ['pending', 'accepted', 'inProgress'].includes(request.status),
  ).length;

test('limpieza: "Reportar desperfecto" solo aparece en Inicio', async () => {
  await mountHousekeeping();
  assert.equal(headerHasDefectButton(), true, 'Inicio');
  for (const nav of ['Habitaciones', 'Solicitudes', 'Historial']) {
    await goTo(nav);
    assert.equal(headerHasDefectButton(), false, nav);
  }
  await goTo('Inicio');
  assert.equal(headerHasDefectButton(), true, 'vuelve a Inicio');
});

test('limpieza: cada solicitud ofrece solo la acción que su estado permite', async () => {
  await mountHousekeeping();
  await goTo('Solicitudes');
  const rows = requestRows();
  const rejectedInSource = (await serviceRequestService.getRequests()).filter(
    (request) =>
      (request.type === 'housekeeping' || request.type === 'maintenance') &&
      request.status === 'rejected',
  ).length;
  assert.ok(rejectedInSource > 0, 'los datos mock incluyen una solicitud rechazada');
  assert.equal(rows.filter((row) => row.status === 'Rechazada').length, rejectedInSource);
  const allowed = {
    Pendiente: ['Atender solicitud'],
    'En proceso': ['Completar solicitud'],
    Completada: [],
    Rechazada: [],
  };
  for (const { status, actions } of rows) {
    assert.ok(status in allowed, `estado conocido: ${status}`);
    assert.deepEqual(actions, allowed[status], `acciones para ${status}`);
  }
});

test('limpieza: atender y completar una solicitud avanza sin transición inválida y actualiza el badge', async () => {
  await mountHousekeeping();
  const openBefore = await expectedOpenRequests();
  assert.equal(navBadge('Solicitudes'), openBefore ? String(openBefore) : undefined);

  await goTo('Solicitudes');
  const pending = requestRows().find((row) => row.status === 'Pendiente');
  assert.ok(pending, 'hay una solicitud pendiente para atender');
  const room = text(pending.row.find((node) => node.type === 'strong'));
  const rowFor = () =>
    requestRows().find((row) => text(row.row.find((node) => node.type === 'strong')) === room);

  await act(async () => buttons('Atender solicitud', pending.row)[0].props.onClick());
  await settle();
  assert.equal(rowFor().status, 'En proceso');
  assert.ok(!toasts().some((toast) => /Transici[oó]n inv[aá]lida/i.test(toast)), toasts().join());
  assert.equal(navBadge('Solicitudes'), String(openBefore), 'sigue abierta: el badge no cambia');

  await act(async () => buttons('Completar solicitud', rowFor().row)[0].props.onClick());
  await settle();
  assert.equal(rowFor().status, 'Completada');
  assert.ok(!toasts().some((toast) => /Transici[oó]n inv[aá]lida/i.test(toast)), toasts().join());
  const openAfter = await expectedOpenRequests();
  assert.equal(openAfter, openBefore - 1);
  assert.equal(navBadge('Solicitudes'), openAfter ? String(openAfter) : undefined);
});

test('limpieza: el badge de Habitaciones cuenta las pendientes y baja al iniciar una limpieza', async () => {
  await mountHousekeeping();
  await goTo('Habitaciones');
  const pendingRooms = () =>
    view.root.findAll(
      (node) => node.type === 'span' && hasClass(node, 'status-pill') && text(node) === 'Pendiente',
    ).length;
  const before = pendingRooms();
  assert.ok(before > 0, 'hay habitaciones pendientes');
  assert.equal(navBadge('Habitaciones'), String(before));

  await act(async () => buttons('Iniciar limpieza')[0].props.onClick());
  await settle();
  assert.equal(pendingRooms(), before - 1);
  assert.equal(navBadge('Habitaciones'), before - 1 ? String(before - 1) : undefined);
});
