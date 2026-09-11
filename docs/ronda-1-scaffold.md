# Ronda 1 — andamiaje de rutas y módulos

**Fecha:** 2026-09-11 · **Rama:** `feat/web-round-1-scaffold` contra `develop`.
Ver también `src/ARCHITECTURE.md`, `src/modules/README.md` y
`docs/DECISIONES.md` D-006 (registro formal de esta decisión).

Este PR no construye ninguna pantalla real. Crea el árbol de los cuatro
módulos de la Ronda 1 y registra sus 14 rutas de una sola vez, para que los
cuatro lotes puedan ramificar sin pisarse el primer día en `routes.ts` /
`router.tsx`.

**Actualización posterior (#50, rama `web-50-ocupacion-alta-manual`):** el
módulo `occupancy` ya dejó de ser stub. `OccupancyScreen` carga habitaciones,
reservas y tipos de habitación para mostrar ocupación por fecha; también lista
reservas activas sin habitación asignada. `ManualBookingScreen` carga huéspedes
y tipos de habitación activos, valida campos requeridos y crea reservas vía
`bookingService.createBooking`.

## 1. Reglas de la ronda

1. **`src/app/routes.ts` y `src/app/router.tsx` quedan congelados.** Quien
   necesite una ruta nueva la pide por PR a JEPG321. Lo mismo aplica a
   `src/modules/auth/models/session.ts` (la unión `Permission` y
   `rolePermissions`): un permiso nuevo también se pide por PR a JEPG321,
   mismo dueño, mismo procedimiento — ver sección 3.
2. **Cada lote escribe solo dentro de su carpeta de módulo**
   (`src/modules/rooms/`, `src/modules/booking-engine/`,
   `src/modules/occupancy/`, `src/modules/front-desk/`). Nada en `shared/`,
   nada en `app/`.
3. **Los primitivos de `shared/components/` son el sistema de estilos del
   proyecto.** `src/index.css` no se extiende; a futuro se reduce a reset y
   variables.
4. **Sigue viva la regla de oro**: nada fuera de la capa de servicios
   (`src/services/`) importa de `src/data/`.
5. **Estados** desde `shared/constants/statuses.ts` (`isRoomAssignable()`
   para asignabilidad, nunca un condicional propio). **Dinero** desde
   `shared/utils/currency.ts` (`formatCurrency`). **Fecha/hora** desde
   `shared/utils/date.ts` (`formatDateGT`/`formatTimeGT`). No existe
   `shared/utils/formatters.ts` — es el nombre que usaba el ticket original;
   se corrige aquí a los dos archivos reales.

## 2. Rutas registradas y su permiso

Públicas (`PublicLayout`, sin guarda):

| Ruta | Pantalla | Módulo |
| --- | --- | --- |
| `/` | `SearchScreen` | booking-engine |
| `/rooms/:roomTypeId` | `RoomDetailScreen` | booking-engine |
| `/booking/new` | `BookingFormScreen` | booking-engine |
| `/booking/:bookingId/done` | `BookingConfirmationScreen` | booking-engine |

Privadas (`RequireSession` + `RequirePermission`):

| Ruta | Pantalla | Módulo | Permiso |
| --- | --- | --- | --- |
| `/pms/rooms` | `RoomListScreen` | rooms | `rooms:manage` |
| `/pms/rooms/new` | `RoomFormScreen` | rooms | `rooms:manage` |
| `/pms/rooms/:roomId/edit` | `RoomFormScreen` | rooms | `rooms:manage` |
| `/pms/room-types` | `RoomTypeListScreen` | rooms | `rooms:manage` |
| `/pms/room-types/new` | `RoomTypeFormScreen` | rooms | `rooms:manage` |
| `/pms/occupancy` | `OccupancyScreen` | occupancy | `occupancy:view` |
| `/pms/bookings/new` | `ManualBookingScreen` | occupancy | `occupancy:view` |
| `/pms/check-in/:bookingId` | `CheckInScreen` | front-desk | `front-desk:operate` |
| `/pms/accounts/:accountId` | `GuestAccountScreen` | front-desk | `front-desk:operate` |
| `/pms/check-out/:bookingId` | `CheckOutScreen` | front-desk | `front-desk:operate` |

## 3. Permisos nuevos en `session.ts`

El guarda `RequirePermission` (WEB-06) valida contra la unión cerrada
`Permission` de `src/modules/auth/models/session.ts` — **no** contra
`permissionsDB`/`rolesDB` de `src/data/db.ts` (catálogo WEB-12). Los dos no
están conectados (por diseño, ver D-003 en `docs/DECISIONES.md`): el primero
es el contrato de sesión de acceso al PMS (`UserRole`: ADMIN/RECEPTIONIST/
MANAGER/STAFF); el segundo es el catálogo configurable de puesto/permiso
(`role.code`/`user.role`). Antes de tocar `session.ts` se revisó
`permissionsDB` (9 registros: `manage_users`, `view_reports`,
`manage_bookings`, `manage_cash`, `manage_housekeeping_tasks`,
`manage_room_service_orders`, `manage_concierge_requests`,
`manage_inventory`, `view_own_tasks`) — ninguno coincide en nombre con los
tres que se agregan aquí, y su convención (`verb_noun`, snake_case) difiere
de la que ya usa `Permission` (`domain:action`). Se siguió la convención de
`session.ts` por ser la que de verdad consume el guarda; la de
`permissionsDB` queda sin tocar.

Se agregaron tres permisos, con esta asignación por rol (`UserRole` de
sesión):

| Permiso | ADMIN | MANAGER | RECEPTIONIST | STAFF |
| --- | :-: | :-: | :-: | :-: |
| `rooms:manage` | ✅ | ✅ | — | — |
| `occupancy:view` | ✅ | ✅ | ✅ | — |
| `front-desk:operate` | ✅ | ✅ | ✅ | — |

**Deuda registrada, sin resolver en este PR**: coexisten dos vocabularios de
permisos — la unión `Permission` de `session.ts` (la que aplica el guarda de
rutas) y `permissionsDB` de `db.ts` (el catálogo WEB-12 que edita el Lote D).
No hay nada que los mantenga sincronizados; si divergen, solo lo detecta
lectura manual, no una prueba. Antes de que el Lote D construya la pantalla
de "roles y permisos" hace falta un ticket propio que decida si se
unifican, se mapean explícitamente, o se documentan como capas
deliberadamente separadas (en la línea de D-003).

## 4. Colisión resuelta: `'/'`

`routePaths.public.home = '/'` ya servía `PublicHomePage` — un shell mínimo
(`src/public/page.tsx` + `src/pages/PublicHomePage.tsx`) con un único botón
"Iniciar sesión". No hacía nada más. Se confirmó que el login tiene rutas
propias independientes (`/auth/login`, `/login` → `LoginPage` →
`StaffLoginPage`), así que `'/'` pasa a servir `SearchScreen` (booking-engine,
Lote B) sin perder alcance del login: `PublicLayout` ahora incluye un enlace
fijo "Personal · Iniciar sesión" hacia `routePaths.public.login`, visible en
toda la zona pública. `PublicHomePage.tsx` y `public/page.tsx` se eliminaron
del árbol (código muerto, sin otras referencias) y se corrigieron sus
menciones en `src/ARCHITECTURE.md` y `src/modules/README.md`.

## 5. Parámetros tipados

No existía un helper de rutas con parámetros tipados en el proyecto; se usa
el genérico de una sola clave de `react-router-dom` (`useParams<'roomId'>()`)
en cada pantalla que lee un parámetro — leer una clave que no se declaró es
error de compilación dentro de esa pantalla. No se instaló ninguna librería
nueva.
