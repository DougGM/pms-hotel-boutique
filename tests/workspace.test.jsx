import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { ReservationFormModal } from '@/modules/front-desk/components/workspace/ReceptionModals';
import { PrivateWorkspace } from '@/private/workspace/PrivateWorkspace';
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

// --- Limpieza: backend falso de HousekeepingController (INT-09) -----------
//
// Replica la regla del backend: cada acción exige un estado de origen exacto y
// responde 400 si no se cumple. La UI nunca debe cambiar sin esa confirmación.

const hkRoom = (id, roomNumber, housekeepingStatus, extra = {}) => ({
  id,
  roomNumber,
  roomTypeId: 'type-standard',
  floor: Number(roomNumber[0]),
  status: 'available',
  housekeepingStatus,
  notes: null,
  updatedAt: '2026-10-03T08:00:00Z',
  ...extra,
});
const hkStayover = (id, roomId, status, description) => ({
  id,
  bookingId: 'booking-1',
  roomId,
  roomNumber: null,
  status,
  description,
  requestedAt: '2026-10-03T09:00:00Z',
  startedAt: status === 'pending' ? null : '2026-10-03T09:10:00Z',
  completedAt: status === 'completed' ? '2026-10-03T09:40:00Z' : null,
  createdAt: '2026-10-03T09:00:00Z',
  updatedAt: '2026-10-03T09:00:00Z',
});

let hkBackend;
let originalFetch;
afterEach(() => {
  if (originalFetch) globalThis.fetch = originalFetch;
  originalFetch = undefined;
});

function installHousekeepingBackend() {
  const state = {
    rooms: [
      hkRoom('room-101', '101', 'dirty'),
      hkRoom('room-102', '102', 'dirty'),
      hkRoom('room-201', '201', 'cleaning', { cleaningStartedAt: '2026-10-03T08:30:00Z' }),
      hkRoom('room-202', '202', 'clean', {
        status: 'occupied',
        cleaningStartedAt: '2026-10-03T07:00:00Z',
        cleaningCompletedAt: '2026-10-03T07:40:00Z',
      }),
    ],
    stayovers: [
      hkStayover('stay-1', 'room-202', 'pending', 'Cambio de toallas'),
      hkStayover('stay-2', 'room-202', 'in_progress', 'Repaso de baño'),
      hkStayover('stay-3', 'room-101', 'completed', 'Tendido de cama'),
      hkStayover('stay-4', 'room-102', 'cancelled', 'Cancelada por el huésped'),
    ],
    requests: [],
  };
  const turnover = {
    start: ['dirty', 'cleaning', 'cleaningStartedAt'],
    complete: ['cleaning', 'clean', 'cleaningCompletedAt'],
    inspect: ['clean', 'inspected', 'inspectedAt'],
  };
  const stayoverFlow = {
    start: ['pending', 'in_progress', 'startedAt'],
    complete: ['in_progress', 'completed', 'completedAt'],
  };
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const path = new URL(String(input)).pathname.replace(/^\/api\/v1/, '');
    const method = init.method ?? 'GET';
    state.requests.push(`${method} ${path}`);
    if (method === 'GET' && path === '/rooms') return json(state.rooms);
    if (path === '/room-types' || path === '/room-features') return json({ status: 403 }, 403);
    // El rol housekeeping no tiene `room-service.read`: el backend real responde 403.
    if (path.startsWith('/room-service/')) return json({ status: 403 }, 403);
    if (method === 'GET' && path === '/housekeeping/rooms') return json(state.rooms);
    if (method === 'GET' && path === '/housekeeping/rooms/stayover-cleanings') {
      return json(state.stayovers);
    }
    const stayover = path.match(/^\/housekeeping\/rooms\/stayover-cleanings\/([^/]+)\/(\w+)$/);
    if (method === 'POST' && stayover) {
      const index = state.stayovers.findIndex((item) => item.id === stayover[1]);
      const [from, to, field] = stayoverFlow[stayover[2]];
      if (state.stayovers[index].status !== from) return json({ status: 400 }, 400);
      state.stayovers[index] = {
        ...state.stayovers[index],
        status: to,
        [field]: '2026-10-03T10:00:00Z',
      };
      return json(state.stayovers[index]);
    }
    const room = path.match(/^\/housekeeping\/rooms\/([^/]+)\/(start|complete|inspect)$/);
    if (method === 'POST' && room) {
      const index = state.rooms.findIndex((item) => item.id === room[1]);
      const [from, to, field] = turnover[room[2]];
      if (state.rooms[index].housekeepingStatus !== from) return json({ status: 400 }, 400);
      state.rooms[index] = {
        ...state.rooms[index],
        housekeepingStatus: to,
        [field]: '2026-10-03T10:00:00Z',
      };
      return json(state.rooms[index]);
    }
    return json({ message: `Ruta no mockeada: ${method} ${path}` }, 404);
  };
  return state;
}

async function mountHousekeeping() {
  hkBackend = installHousekeepingBackend();
  await act(async () => {
    view = create(
      <MemoryRouter>
        <PrivateWorkspace role="housekeeping" sessionName="Limpieza Test" />
      </MemoryRouter>,
    );
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
const roomCards = () =>
  view.root
    .findAll((node) => node.type === 'div' && hasClass(node, 'hk-room-card'))
    .map((card) => ({
      card,
      number: text(card.find((node) => node.type === 'strong')),
      status: text(card.find((node) => hasClass(node, 'status-pill'))),
    }));
const cardFor = (number) => roomCards().find((card) => card.number === `Habitación ${number}`);
const toasts = () => view.root.findAll((node) => hasClass(node, 'toast')).map(text);
const expectedOpenRequests = () =>
  hkBackend.stayovers.filter((request) => ['pending', 'in_progress'].includes(request.status))
    .length;

test('limpieza: el panel carga sin pedir datos para los que el rol no tiene permiso', async () => {
  await mountHousekeeping();
  assert.ok(hkBackend.requests.includes('GET /housekeeping/rooms'));
  assert.ok(hkBackend.requests.includes('GET /housekeeping/rooms/stayover-cleanings'));
  assert.deepEqual(
    hkBackend.requests.filter((request) => request.includes('/room-service/')),
    [],
    'el catálogo de Room Service exige room-service.read',
  );
  assert.deepEqual(
    hkBackend.requests.filter(
      (request) => request.includes('/room-types') || request.includes('/room-features'),
    ),
    [],
    'el catálogo de habitaciones exige room-types.read/room-features.read',
  );
});

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
  assert.equal(rows.length, hkBackend.stayovers.length, 'las solicitudes salen del backend');
  assert.equal(
    rows.filter((row) => row.status === 'Rechazada').length,
    1,
    'una tarea cancelled del backend se muestra como Rechazada',
  );
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
  const openBefore = expectedOpenRequests();
  assert.equal(navBadge('Solicitudes'), openBefore ? String(openBefore) : undefined);

  await goTo('Solicitudes');
  const pending = requestRows().find((row) => row.status === 'Pendiente');
  assert.ok(pending, 'hay una solicitud pendiente para atender');
  const requestInfo = (row) => text(row.find((node) => hasClass(node, 'hk-req-info')));
  const description = requestInfo(pending.row);
  const rowFor = () => requestRows().find((row) => requestInfo(row.row) === description);

  await act(async () => buttons('Atender solicitud', pending.row)[0].props.onClick());
  await settle();
  assert.equal(rowFor().status, 'En proceso');
  assert.ok(!toasts().some((toast) => /rechaz/i.test(toast)), toasts().join());
  assert.equal(navBadge('Solicitudes'), String(openBefore), 'sigue abierta: el badge no cambia');

  await act(async () => buttons('Completar solicitud', rowFor().row)[0].props.onClick());
  await settle();
  assert.equal(rowFor().status, 'Completada');
  assert.ok(!toasts().some((toast) => /rechaz/i.test(toast)), toasts().join());
  const openAfter = expectedOpenRequests();
  assert.equal(openAfter, openBefore - 1);
  assert.equal(navBadge('Solicitudes'), openAfter ? String(openAfter) : undefined);
  assert.equal(
    hkBackend.rooms.find((room) => room.id === 'room-202').status,
    'occupied',
    'stayover no libera la habitación',
  );
});

test('limpieza: el badge de Habitaciones cuenta las pendientes y baja al iniciar una limpieza', async () => {
  await mountHousekeeping();
  await goTo('Habitaciones');
  const pendingRooms = () => roomCards().filter((card) => card.status === 'Pendiente').length;
  const before = pendingRooms();
  assert.equal(before, 2, 'las dos habitaciones dirty del backend');
  assert.equal(navBadge('Habitaciones'), String(before));

  await act(async () => buttons('Iniciar limpieza')[0].props.onClick());
  await settle();
  assert.equal(pendingRooms(), before - 1);
  assert.equal(navBadge('Habitaciones'), before - 1 ? String(before - 1) : undefined);
  assert.equal(hkBackend.rooms[0].housekeepingStatus, 'cleaning', 'la transición pasó por la API');
});

test('limpieza: una habitación limpia se inspecciona contra el backend', async () => {
  await mountHousekeeping();
  await goTo('Habitaciones');
  assert.equal(cardFor('202').status, 'Completada');

  await act(async () => buttons('Inspeccionar', cardFor('202').card)[0].props.onClick());
  await settle();
  assert.equal(cardFor('202').status, 'Inspeccionada');
  assert.equal(hkBackend.rooms[3].housekeepingStatus, 'inspected');
  assert.equal(hkBackend.rooms[3].status, 'occupied', 'el turnover no toca Room.status');
});

test('limpieza: si el backend rechaza la transición se muestra el estado real', async () => {
  await mountHousekeeping();
  await goTo('Habitaciones');
  assert.equal(cardFor('101').status, 'Pendiente');

  // Otra persona inició la limpieza desde la app móvil; esta pantalla aún no lo sabe.
  hkBackend.rooms[0] = { ...hkBackend.rooms[0], housekeepingStatus: 'cleaning' };
  await act(async () => buttons('Iniciar limpieza', cardFor('101').card)[0].props.onClick());
  await settle();

  assert.ok(
    toasts().some((toast) => /rechazó la transición/.test(toast)),
    toasts().join(),
  );
  assert.equal(cardFor('101').status, 'En proceso', 'se recargó el estado real del backend');
});
