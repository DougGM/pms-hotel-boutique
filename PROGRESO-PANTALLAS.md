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

| Commit    | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Historias / pantallas que cubre                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `12708d7` | Conecta las 13 pantallas existentes al flujo de navegación: entradas nuevas en `privateNavigation` para Habitaciones, Tipos de habitación y Ocupación; botón "Nueva reserva" y columna de acciones (check-in / cuenta de huésped) en `OccupancyScreen`; botón "Ir a check-out" en `GuestAccountScreen`.                                                                                                                                                                      | Transversal — sin esto ninguna pantalla era alcanzable clickeando.                                   |
| `39d51cc` | Actualiza los conteos de menú por rol en `tests/auth.test.jsx` (Recepción 2→3, Admin 7→10) tras agregar las entradas de navegación.                                                                                                                                                                                                                                                                                                                                          | Corrección de `npm run check` sobre el commit anterior.                                              |
| `88e6b8c` | Agrega un `Modal` de confirmación antes de ejecutar el check-out en `CheckOutScreen` (cerraba la cuenta y la estadía con un solo clic, sin confirmación).                                                                                                                                                                                                                                                                                                                    | Grupo 4, pantalla 14 — "acciones destructivas piden confirmación".                                   |
| `34115fc` | `RoomListScreen` real: filtros por estado y tipo de habitación sobre `roomService.getRooms()`/`getRoomTypes()`, enlace a edición por fila. Reemplaza el stub.                                                                                                                                                                                                                                                                                                                | Grupo 1, pantalla 1/4 — "listado de habitaciones con filtros por tipo y estado" (WEB-16).            |
| `92a1f4b` | `RoomFormScreen` real: alta y edición de habitación contra `roomService.createRoom`/`updateRoom`, con validación. Reemplaza el stub.                                                                                                                                                                                                                                                                                                                                         | Grupo 1, pantalla 2/4 — "alta y edición de habitación" (WEB-17).                                     |
| `89069f4` | `RoomTypeListScreen` real: listado de tipos con características resueltas por nombre. Reemplaza el stub. Sin acción de editar todavía (bloqueado).                                                                                                                                                                                                                                                                                                                           | Grupo 1, pantalla 3/4 — "listado de tipos de habitación" (WEB-18).                                   |
| `49fd5c0` | Agrega `CreateRoomTypeDto`/`UpdateRoomTypeDto`, `roomService.createRoomType`/`updateRoomType`/`getRoomTypeById`, y la ruta `roomTypeEdit` en `routes.ts`/`router.tsx` — no existían y bloqueaban la pantalla 4/4. Autorizado explícitamente por el propietario del repo para esta excepción puntual (ver nota en el commit).                                                                                                                                                 | Infraestructura — desbloquea Grupo 1, pantalla 4/4.                                                  |
| `4d22d27` | `RoomTypeFormScreen` real: alta y edición de tipo de habitación. Reemplaza el stub.                                                                                                                                                                                                                                                                                                                                                                                          | Grupo 1, pantalla 4/4 — "alta y edición de tipo de habitación" (WEB-18).                             |
| `b383a8a` | Agrega el botón "Editar" por fila en `RoomTypeListScreen`, ahora que la ruta y el formulario de edición existen.                                                                                                                                                                                                                                                                                                                                                             | Cierra el Grupo 1 completo (4/4).                                                                    |
| `a3c72cb` | Agrega `UpdateBookingDto`, `bookingService.updateBooking`/`confirmBooking`/`cancelBooking`, y las rutas `bookingDetail`/`bookingEdit` — no existían y bloqueaban la pantalla 11. Autorizado con el mismo criterio general que `roomTypeEdit` (ver nota en el commit).                                                                                                                                                                                                        | Infraestructura — desbloquea Grupo 3, pantalla 11.                                                   |
| `cae6964` | `BookingDetailScreen`: detalle de reserva, edición (solo si `pending`/`confirmed`), "Confirmar reserva" (solo si la transición es válida) y "Cancelar reserva" (Modal, exige motivo). Enlazada desde el código de confirmación en `OccupancyScreen`, antes sin ningún lugar desde el que hacer clic.                                                                                                                                                                         | Grupo 3, pantalla 11/11 — cierra el grupo.                                                           |
| `cfc0cec` | `bookingService.checkIn` ahora crea la cuenta del huésped (saldo cero) si no existe, en vez de asumir que ya está sembrada en el mock. Bug preexistente encontrado al rastrear el ciclo completo (crear → confirmar → check-in → cargo → check-out) para verificar la pantalla 11: sin esto, el check-in de **cualquier** reserva creada en vivo (manual o del motor público) fallaba siempre en el último paso. Incluye prueba de regresión en `scripts/test-services.mjs`. | Corrección transversal, no específica de una pantalla — ver "Verificación del ciclo completo" abajo. |

## Estado por grupo

- **Grupo 1 (inventario del hotel): 4/4 completas.**
- **Grupo 2 (motor de reservas público): ya estaba completo en `develop`** antes de esta rama (no se tocó en este trabajo, salvo lo señalado en el reporte de auditoría de la conversación: falta captura de datos personales reales en `BookingFormScreen` y fotografías en `RoomDetailScreen`, ninguno de los dos es un hueco de navegación).
- **Grupo 3 (recepción): 3/3 completas.** `OccupancyScreen` y `ManualBookingScreen` ya estaban en `develop` (navegación agregada en `12708d7`); `BookingDetailScreen` (pantalla 11) se construyó en esta rama.
- **Grupo 4 (operación y dinero): ya estaba completo en `develop`**, con el fix de confirmación de `88e6b8c`.

**Las 14 pantallas de la Ronda 1 están completas y alcanzables por navegación.**

## Verificación del ciclo completo

No fue posible probar en el navegador: la extensión Claude in Chrome no
estuvo conectada en ningún momento de esta sesión (`tabs_context_mcp`
devolvió "Browser extension is not connected" en dos intentos, separados
por casi toda la sesión). Lo que sigue es un **rastreo de código**, no una
verificación visual — pendiente de que alguien lo confirme en el
navegador antes de dar el ciclo por probado de verdad.

Rastreado: crear reserva manual → confirmar → check-in (con asignación de
habitación) → agregar un cargo → check-out.

1. `ManualBookingScreen` → `bookingService.createBooking`: status `pending`. OK.
2. `BookingDetailScreen` → `bookingService.confirmBooking`: `pending → confirmed` es válida. OK.
3. `CheckInScreen` → `assignRoom` + `checkIn`: `confirmed → checkedIn` es válida; con el fix de `cfc0cec`, la cuenta del huésped se crea aquí (antes fallaba siempre en este paso para una reserva nueva). OK tras el fix.
4. `GuestAccountScreen` → `createCharge`: ahora encuentra la cuenta (existe desde el paso 3) y agrega el cargo correctamente. OK.
5. `CheckOutScreen` → `checkOut`: encuentra booking y cuenta (ambos ya existen), `checkedIn → checkedOut` es válida, ahora pide confirmación (`88e6b8c`). OK.

**El ciclo cierra en el rastreo de código.** Dos observaciones menores, no bloqueantes, encontradas de paso:

- `CheckInScreen` navega a la cuenta con una ruta escrita a mano
  (`` `/pms/accounts/${account.id}` ``) en vez de
  `routePaths.pms.guestAccount.replace(...)` como el resto de las
  pantallas. Inconsistente pero funciona igual.
- `bookingService.checkOut` no cierra la `GuestAccount` (`status` se
  queda en `'open'`) — no se tocó porque no estaba pedido y no rompe el
  ciclo solicitado, pero vale una decisión aparte.
