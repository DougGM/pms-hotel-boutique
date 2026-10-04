# Capa de servicios

Los componentes consumen servicios, no datos mock ni DTOs directamente. Cada
servicio simula latencia, puede lanzar un error controlado y transforma los
DTOs mediante el mapper correspondiente antes de devolver modelos de dominio.

```tsx
import { useEffect, useState } from 'react';
import { roomService } from '@/services/roomService';
import type { Room } from '@/shared/types/entities';

export function RoomsView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    roomService
      .getRooms()
      .then((data) => {
        if (active) setRooms(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Error inesperado');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <ErrorState message={error} />;
  return <RoomList rooms={rooms} />;
}
```

Servicios disponibles: `authService`, `roomService`, `bookingService`,
`bookingCompanionService`, `guestService`, `paymentService`, `catalogService`,
`guestAccountService`, `cashService`, `personnelService`, `inventoryService`,
`auditService`, `orderService`, `serviceRequestService` y `notificationService`. Las
operaciones de creación reciben los DTOs de entrada definidos en
`src/shared/types/entities`; sus respuestas siempre son modelos de dominio.
Los servicios que aun no tienen integracion backend leen de `src/data/db.ts`,
la unica "base de datos" simulada del proyecto — ver `src/ARCHITECTURE.md`.
Desde INT-01, `authService` usa el backend Spring configurado con
`VITE_API_BASE_URL`; las integraciones posteriores se documentan abajo.

Nota frontend beta: `personnelService.getPermissions()` sigue leyendo
`permissionsDB` porque el backend expone permisos como claves dentro de cada
rol, no como recurso independiente. `usersDB` queda como directorio operativo
historico del Lote D.

## WEB-14: servicios faltantes de la vertical Ronda 1

`roomService` expone `createRoom(data)`, `updateRoom(id, data)` y
`getRoomTypes()`. Los dos primeros escriben en `roomsDB`, generan/actualizan
timestamps y devuelven `Room` de dominio; `getRoomTypes()` devuelve
`RoomType[]` desde `roomTypesDB`.

`bookingService` expone `checkIn(bookingId)`, `checkOut(bookingId)` y
`assignRoom(bookingId, roomId)`. `checkIn`/`checkOut` validan contra
`BOOKING_STATUS_TRANSITIONS`; una transición inválida lanza error. `checkIn`
abre/reutiliza la cuenta de huésped y marca la habitación asignada como
`occupied`. `assignRoom` solo asigna habitaciones que `isRoomAssignable()`
considera aptas.
`createBooking(data)` y `updateBooking(id, data)` validan la capacidad maxima
del tipo de habitacion antes de persistir: `adults + children` no puede superar
`roomType.capacity`, pero una reserva exactamente igual a la capacidad es valida.

`bookingCompanionService` expone `getCompanionsByBookingId(bookingId)` y
`saveCompanionsForBooking(bookingId, data)`. Persiste acompañantes en
`bookingCompanionsDB`, valida campos requeridos, capacidad de la habitación y
coherencia con `booking.adults/children` contando al huésped principal como un
adulto.

`guestAccountService.createCharge(data)` crea un `Charge` real, lo marca como
`posted`, calcula `amount_cents = quantity * unit_price_cents` y actualiza el
`balance_cents` guardado de la cuenta abierta de esa reserva.

Actualizacion 2026-09-21 (#71): el folio es la fuente de verdad financiera de
la estancia. `checkIn` abre/sincroniza la cuenta y crea el cargo base de
estancia de forma idempotente con `category: 'stay'`; `createCharge`,
`createPayment` y `voidCharge`
recalculan `balance_cents` como cargos `posted` menos pagos `completed` menos
depositos no `refunded`. `checkOut` bloquea si queda saldo pendiente; cuando el
saldo esta exactamente en cero cierra la cuenta, marca la reserva como
`checkedOut` y deja la habitacion `available` + `dirty` para limpieza.

Actualizacion 2026-10-02 (#103): cuando el `bookingId` pertenece al backend
real (UUID), `guestAccountService` usa `GuestFolioController`,
`PaymentController` y `DepositController` mediante `http-client.ts` para folio,
cargos, anulaciones, pagos, depositos, aplicacion y reembolso. Los IDs mock
legacy (`BKG-*`) siguen usando la persistencia simulada mientras booking/check-in
terminan su propia integracion; no son fuente oficial para flujos backend.
Actualizacion 2026-10-03 (#103): las utilidades legacy
`openOrSyncAccountForBooking`, `closeAccountForCheckout` y
`calculateAccountBalanceCents` rechazan reservas UUID para evitar que un flujo
integrado mezcle datos reales con el folio mock. En reservas UUID, el saldo
oficial siempre viene de `GET /bookings/{bookingId}/folio`. `voidCharge`
tambien exige `bookingId` cuando el `chargeId` es UUID; la firma antigua
`voidCharge(chargeId, reason)` queda limitada a cargos mock.
`GuestAccountScreen` tambien usa ese contrato: si la ruta recibe un UUID lo
trata como `bookingId` y carga el folio por `getAccountByBookingId`; despues
de crear cargos o pagos vuelve a consultar el folio en vez de ajustar
`balanceCents` manualmente en React.

Actualizacion 2026-09-17: `guestService.createGuest(data)` crea huespedes demo
en `guestsDB`, genera el siguiente ID `GST-*`, agrega timestamps y devuelve
`Guest` de dominio. El motor publico de reservas lo usa para no pedir al
usuario un ID interno antes de crear la reserva.
`guestService.updateGuest(id, data)` permite conservar cambios válidos del
titular capturados durante recepción/check-in.

Actualizacion 2026-09-22 (#72): el portal de huesped ya no confirma acciones
solo en estado local. `orderService.createOrder()` persiste pedidos de Room
Service contra `booking_id`/`room_id`/`guest_id`, valida productos activos y
`cancelOrder()` solo permite cancelar pedidos `pending` o `accepted` del mismo
huesped. `serviceRequestService.createRequest()` y `cancelRequest()` hacen lo
mismo para solicitudes de habitacion; la cancelacion de solicitudes se
representa con el estado contractual `rejected` en `service_request`.
`notificationService.markNotificationRead()` y `markAllRead()` conservan las
marcas de lectura en `notificationReadsDB`, dentro de `src/data/db.ts`, sin
crear una entidad `notification` propia.

Actualizacion 2026-09-22 (#73): las operaciones de Limpieza que antes vivian
solo en estado React ahora persisten en `localStorage` mediante la capa de
servicios mock. `roomService.updateRoom()` guarda cambios de
`housekeeping_status` en `PMS_ROOMS_DB`; `serviceRequestService` crea reportes
de desperfectos (`maintenance`) y cambia estados de solicitudes en
`PMS_SERVICE_REQUESTS_DB`; `housekeepingService` conserva snapshots de
checklist, tiempos e historial operativo en `PMS_HOUSEKEEPING_STORE`. Los
handlers del workspace esperan estos metodos antes de mostrar mensajes de
exito, por lo que un error conserva el estado anterior visible.
Los reportes de desperfectos se asocian solo a una reserva real confirmada o
en check-in para la habitacion; si no existe, el servicio rechaza la operacion
en vez de crear un `booking_id` ficticio.

Actualizacion 2026-09-22 (#74): Room Service y Conserjeria ya no dependen de
`setState` para aceptar, rechazar, cancelar, observar o completar. Los pedidos
usan `orderService.updateOrderStatus()` y `updateOrderNotes()` sobre
`PMS_ORDERS_DB`; al pasar a `delivered` crean exactamente un `Charge` real en
el folio abierto con `guestAccountService.createCharge()` y guardan su
`charge_id`. Si el caller envia un `createdByUserId` operativo real, el cargo
lo conserva; si no, queda como cargo automatico sin inventar usuario creador.
Reintentar `delivered` conserva el mismo cargo; `rejected` y `cancelled` no
crean cargos. Conserjeria usa
`serviceRequestService.updateRequestStatus()` y `updateRequestNotes()` sobre
`PMS_SERVICE_REQUESTS_DB` para conservar estados, motivos y observaciones.

Actualizacion 2026-09-29 (#87): los botones `Actualizar` de Menu/Historial de
Room Service y de Historial de Conserjeria recargan datos desde los servicios
mock vigentes en vez de solo emitir notificaciones. `Registrar insumo` en el
inventario de cocina crea un movimiento real con `inventoryService.createMovement`
(`type: in`, `reason: restock`) sobre `PMS_INVENTORY_MOVEMENTS_DB` y actualiza
`PMS_INVENTORY_ITEMS_DB`. El detalle de Conserjeria usa la solicitud real
seleccionada, muestra `bookingId`, habitacion, estado, fechas y notas disponibles,
sin completar datos ausentes con valores inventados.

Actualizacion 2026-09-24 (#75): Administracion ya no muestra metricas
operativas hardcodeadas como si fueran actuales. `AdminContent` calcula
dashboard/reportes desde habitaciones, reservas, caja, inventario y auditoria
cargadas por servicios, con moneda GTQ. Las operaciones soportadas esperan a
servicios persistibles antes de mostrar exito: habitaciones/tipos/tarifas usan
`roomService` (`PMS_ROOMS_DB`, `PMS_ROOM_TYPES_DB`, `PMS_RATES_DB`),
promociones usan `promotionService` (`PMS_PROMOTIONS_DB`), inventario usa
`inventoryService` (`PMS_INVENTORY_ITEMS_DB`,
`PMS_INVENTORY_MOVEMENTS_DB`) y caja usa `cashService` contra el backend real.
Usuarios/roles,
amenidades, catalogo de Room Service y tarifas dinamicas no mutan porque no
tienen contrato de escritura vigente en esta rama; la UI informa fuera de
alcance en vez de simular guardados locales.
Inventario solo guarda `responsible_user_id` cuando el caller envia un `User.id`
existente; si no hay usuario de sesion, el campo queda ausente y nunca se
reemplaza por un administrador o recepcionista por defecto. En caja, el
responsable operativo lo define el backend desde la sesion autenticada.

## Forzar errores mock

1. En código: `mockUtils.setForceError(true)` y, al terminar la prueba,
   `mockUtils.setForceError(false)`.
2. En la URL: agrega `?mockError=true` a la ruta actual.
3. En el navegador: ejecuta
   `localStorage.setItem('PMS_FORCE_MOCK_ERROR', 'true')` y elimínalo con
   `localStorage.removeItem('PMS_FORCE_MOCK_ERROR')`.

Todas las operaciones esperan entre 300 y 600 ms por defecto. Para pruebas
unitarias se puede usar `simulateLatency(0, 0)` directamente.

## Integracion con INT-01

`authService.login(email, password, signal?)` conserva su API y admite cancelar
una solicitud pendiente. Ya no valida contra `sessionAccountsDB`: envia
`{ email, password }` a `POST /auth/login` del backend Spring.

El backend devuelve `accessToken`, `refreshToken`, `tokenType` y `expiresIn`.
`authService` normaliza esa respuesta al contrato de sesion del frontend,
decodifica el JWT para obtener `sub`, `ROLE_*` y `authorities`, y persiste solo
tokens/metadatos en `PMS_AUTH_SESSION`.
La sesion persistida conserva dos vencimientos: `expiresAt` para la ventana de
8 horas del frontend y `accessExpiresAt` para el JWT. Al restaurar, si el `exp`
del access token ya vencio o esta dentro de la ventana preventiva,
`authService` llama `POST /auth/refresh` antes de devolver la sesion como
valida.

`http-client.ts` agrega `Authorization: Bearer <accessToken>` automaticamente.
Ante un `401` protegido, llama `POST /auth/refresh` con `{ refreshToken }`,
actualiza ambos tokens y reintenta la solicitud original una sola vez. Si el
refresh falla, limpia la sesion local para obligar un nuevo login.

`logout()` envia `POST /auth/logout` con el refresh token y siempre limpia la
persistencia local, incluso si la confirmacion remota falla. `clearSession()`
expone la limpieza local sincrona. La clave legacy `hotel-aurora.auth.v1` se
elimina al restaurar o limpiar sesion.

## Integracion con INT-08

`auditService.getLogs({ from, to })` consume `GET /admin/audit-logs` enviando
los parametros reales `from` y `to` como date-time ISO. Si no se indica rango,
usa una ventana amplia para mantener la carga inicial de Administracion.

`reportingService.getOperationalReport({ from, to })` consume
`GET /admin/reports/operations` y la vista de Reportes de Administracion usa
ese agregado oficial para ingresos, reservas, cancelaciones, noches ocupadas y
ordenes de Room Service del periodo seleccionado.
Cuando existe ese reporte oficial, Administracion no mezcla sus cifras con
reservas, habitaciones o cortes de caja locales: las reservas vigentes salen de
`bookingsByStatus` y los promedios o tendencias no expuestos por Reporting API
se muestran como no disponibles.

`reportingService.getStayReceipt(bookingId)` consume
`GET /admin/bookings/{bookingId}/receipt`, normaliza cargos, pagos y depositos
a modelos de dominio y se usa al descargar recibos de estancia cuando la
reserva tiene un UUID de backend. Las reservas demo `BKG-*` conservan el
recibo local como fallback de prototipo.

## Integracion con INT-07

`catalogService.getProducts()` conserva el catalogo operativo de Room Service
en `GET /room-service/products`, pensado para devolver productos disponibles.
Para Administracion se agrego `getAdminProducts()` sobre
`GET /admin/room-service/products`, que incluye activos e inactivos, junto con
`POST /admin/room-service/products` y
`PUT /admin/room-service/products/{id}` para crear, editar y activar/desactivar
productos sin cambiar el comportamiento de las pantallas operativas.

`getAmenities()` conserva la lectura compatible con huespedes en
`GET /admin/amenities?active=true`. Administracion usa `getAdminAmenities()`
sobre `GET /admin/amenities` para ver activas e inactivas, y las escrituras
`POST /admin/amenities` / `PUT /admin/amenities/{id}` para crear, editar y
cambiar estado.

`personnelService.getUsers()`, `getUserById()` y `getRoles()` consumen
`GET /admin/users`, `GET /admin/users/{id}` y `GET /admin/roles`; `roleCode`
se normaliza al literal de rol usado por el frontend solo en respuestas.
`createUser()` usa el DTO real del backend con `firstName`, `lastName`,
`email`, `password` y `roleId`; no envia `roleCode` ni `status`.
`updateUser()` usa `firstName`, `lastName`, `email`, `roleId` y `status` para
edicion y activacion/desactivacion. `getPermissions()` conserva el catalogo
local por compatibilidad hasta que exista un endpoint dedicado.

`promotionService` usa `GET/POST/PUT /admin/promotions`. Como el backend no
expone `GET /admin/promotions/{id}`, las actualizaciones obtienen primero la
lista, mezclan los campos parciales del UI y envian el request completo que
requiere Spring.

`inventoryService` usa `GET /inventory/items`,
`GET /inventory/items/{id}`, `GET /inventory/items/{id}/movements`,
`POST /inventory/items/{id}/movements` y
`PUT /admin/inventory/items/{id}`. El backend no acepta `currentQuantity` en
el upsert administrativo, por lo que un ajuste manual de existencias se aplica
con un movimiento compensatorio `restock` o `shrinkage`.

Las lecturas anteriores conservan un fallback local solo cuando el backend no
esta disponible o el harness de pruebas responde 404 a rutas no mockeadas; las
respuestas HTTP reales distintas de 404 se propagan como error. Las escrituras
usan el contrato HTTP del backend.

## Integracion con INT-06 (#104)

`cashService` conserva su API de dominio para las pantallas administrativas,
pero ya no usa `cashSessionsDB`, `cashMovementsDB` ni `localStorage` como fuente
oficial. Las operaciones de caja se envian al backend Spring mediante
`http-client.ts`:

- `GET /cash-sessions/current` para consultar la jornada abierta del usuario.
- `GET /cash-sessions/{id}/movements` para consultar movimientos.
- `POST /cash-sessions/open` con `openingBalanceCents` y `notes`.
- `POST /cash-sessions/{id}/movements` con `type`, `concept` y `amountCents`.
- `POST /cash-sessions/{id}/close` con `countedBalanceCents` y `notes`.

`getSessions()` mantiene el nombre de la API de dominio por compatibilidad con
las pantallas existentes, pero hoy representa como maximo `[currentSession]`; no
es un historial. Al cerrar caja, la UI debe volver a consultar `/current` y
esperar `[]` si ya no hay jornada abierta. La apertura de una jornada envia el
saldo inicial indicado por la pantalla de apertura y no hereda automaticamente
el saldo esperado de una jornada anterior.

Los montos siguen en centavos y la moneda se mantiene como `GTQ`. Los totales
`totalIncomeCents`, `totalExpenseCents` y `expectedBalanceCents` son autoridad
del backend; Administracion los usa cuando vienen en la respuesta y solo
conserva calculos locales como respaldo visual para datos historicos sin esos
campos.
