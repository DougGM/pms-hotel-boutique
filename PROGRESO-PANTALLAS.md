# Progreso de pantallas — Ronda 1

Bitácora de la rama `feat/pantallas-ronda-1`. Contexto completo en la
conversación que originó esta rama: antes de escribir código se hizo un
inventario que encontró que 13 de las 14 pantallas de la Ronda 1 ya
existían en `develop` (trabajo de otros colaboradores), pero casi ninguna
era alcanzable desde el menú, y varias tenían huecos de calidad (rooms era
puro stub, check-out sin confirmación, etc.). El trabajo de esta rama es
esa auditoría más las correcciones y pantallas que faltaban, no un
scaffold desde cero.

## Commits

| Commit    | Qué hace                                                                                                                                                                                                                                                                                                                     | Historias / pantallas que cubre                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `12708d7` | Conecta las 13 pantallas existentes al flujo de navegación: entradas nuevas en `privateNavigation` para Habitaciones, Tipos de habitación y Ocupación; botón "Nueva reserva" y columna de acciones (check-in / cuenta de huésped) en `OccupancyScreen`; botón "Ir a check-out" en `GuestAccountScreen`.                      | Transversal — sin esto ninguna pantalla era alcanzable clickeando.                        |
| `39d51cc` | Actualiza los conteos de menú por rol en `tests/auth.test.jsx` (Recepción 2→3, Admin 7→10) tras agregar las entradas de navegación.                                                                                                                                                                                          | Corrección de `npm run check` sobre el commit anterior.                                   |
| `88e6b8c` | Agrega un `Modal` de confirmación antes de ejecutar el check-out en `CheckOutScreen` (cerraba la cuenta y la estadía con un solo clic, sin confirmación).                                                                                                                                                                    | Grupo 4, pantalla 14 — "acciones destructivas piden confirmación".                        |
| `34115fc` | `RoomListScreen` real: filtros por estado y tipo de habitación sobre `roomService.getRooms()`/`getRoomTypes()`, enlace a edición por fila. Reemplaza el stub.                                                                                                                                                                | Grupo 1, pantalla 1/4 — "listado de habitaciones con filtros por tipo y estado" (WEB-16). |
| `92a1f4b` | `RoomFormScreen` real: alta y edición de habitación contra `roomService.createRoom`/`updateRoom`, con validación. Reemplaza el stub.                                                                                                                                                                                         | Grupo 1, pantalla 2/4 — "alta y edición de habitación" (WEB-17).                          |
| `89069f4` | `RoomTypeListScreen` real: listado de tipos con características resueltas por nombre. Reemplaza el stub. Sin acción de editar todavía (bloqueado).                                                                                                                                                                           | Grupo 1, pantalla 3/4 — "listado de tipos de habitación" (WEB-18).                        |
| `49fd5c0` | Agrega `CreateRoomTypeDto`/`UpdateRoomTypeDto`, `roomService.createRoomType`/`updateRoomType`/`getRoomTypeById`, y la ruta `roomTypeEdit` en `routes.ts`/`router.tsx` — no existían y bloqueaban la pantalla 4/4. Autorizado explícitamente por el propietario del repo para esta excepción puntual (ver nota en el commit). | Infraestructura — desbloquea Grupo 1, pantalla 4/4.                                       |
| `4d22d27` | `RoomTypeFormScreen` real: alta y edición de tipo de habitación. Reemplaza el stub.                                                                                                                                                                                                                                          | Grupo 1, pantalla 4/4 — "alta y edición de tipo de habitación" (WEB-18).                  |
| `b383a8a` | Agrega el botón "Editar" por fila en `RoomTypeListScreen`, ahora que la ruta y el formulario de edición existen.                                                                                                                                                                                                             | Cierra el Grupo 1 completo (4/4).                                                         |

## Estado por grupo

- **Grupo 1 (inventario del hotel): 4/4 completas.**
- **Grupo 2 (motor de reservas público): ya estaba completo en `develop`** antes de esta rama (no se tocó en este trabajo, salvo lo señalado en el reporte de auditoría de la conversación: falta captura de datos personales reales en `BookingFormScreen` y fotografías en `RoomDetailScreen`, ninguno de los dos es un hueco de navegación).
- **Grupo 3 (recepción): 2/3 ya estaban en `develop`** (`OccupancyScreen`, `ManualBookingScreen`, con navegación agregada en `12708d7`). La pantalla 11 ("detalle y edición de reserva") sigue sin existir — ver bloqueo abajo.
- **Grupo 4 (operación y dinero): ya estaba completo en `develop`**, con el fix de confirmación de `88e6b8c`.

## Bloqueada: detalle y edición de reserva (Grupo 3, pantalla 11)

Mismo tipo de bloqueo que tuvo la pantalla 4 del Grupo 1, esta vez sin
resolver todavía:

- No existe ninguna ruta reservada para el detalle ni la edición de una
  reserva en `routePaths.pms` / `router.tsx` (el array `routes.pms` de
  `src/app/routes.ts` sí menciona `/pms/reception/reservations/:reservationId`
  y su `/edit` como rutas _futuras_ del catálogo completo, pero no están
  promovidas al objeto `routePaths.pms` que usa el router — ninguna
  pantalla puede navegar ahí hoy).
- `bookingService.ts` no tiene un método de edición genérico: solo
  `checkIn`, `checkOut` y `assignRoom` (transiciones puntuales) y
  `createBooking`. No hay `updateBooking`, ni `cancelBooking`, ni
  `confirmBooking` — esto último importa porque una reserva creada por
  `ManualBookingScreen` queda en estado `pending` y no hay ninguna
  pantalla que la mueva a `confirmed` (paso previo obligatorio para poder
  hacer check-in, según `BOOKING_STATUS_TRANSITIONS`).

Pendiente de la misma decisión que se tomó para `roomTypeEdit`: si se
autoriza agregar la ruta y los métodos de servicio, o si se deja fuera de
esta rama para pedirla aparte.
