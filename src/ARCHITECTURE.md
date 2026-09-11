# Arquitectura del Frontend

```text
src/
  public/                 Vistas disponibles sin sesión
    pages/                Páginas públicas adicionales (incluye el catálogo de UI, /components)
  private/                Vistas autenticadas de empleados y administración
    page.tsx              Layout con menú principal
    pages/                Páginas privadas que combinan módulos
    guards/                RequireSession, RequirePermission
    routes/                Catálogo de navegación privada por permiso
  layouts/                Layouts conectados a React Router (PublicLayout incluye el
                          enlace "Personal · Iniciar sesión" hacia el login de staff)
  pages/                  Páginas base conectadas a las rutas (LoginPage, OperationsHomePage)
  modules/
    auth/                 Sesión de personal: modelos, mappers, servicios (fachada) y componentes
    ui-catalog/            Ejemplos asíncronos del catálogo de componentes
    rooms/                 Lote D (Ronda 1) — screens/, components/
    booking-engine/        Lote B (Ronda 1) — screens/, components/ (motor de reserva público)
    occupancy/              Lote A (Ronda 1) — screens/, components/
    front-desk/             Lote C (Ronda 1) — screens/, components/
  shared/
    components/           Button, Input, Select, Modal, DatePickerRange, Card, Badge,
                           EmptyState, LoadingState, ErrorState, DataTable (TableFrame), Pagination
    constants/
      statuses.ts          Literales y transiciones de estado compartidos con la app móvil
                           (room, booking, order, service_request) — ver "Contrato de datos" abajo
    mocks/                 lot-b.ts (habitaciones, huéspedes, reservas, tarifas, promociones),
                           lot-c.ts (cuentas, cargos, pagos, depósitos, caja — WEB-11),
                           lot-d.ts (personal, roles/permisos, amenidades, productos,
                           inventario, auditoría — WEB-12)
    types/
      common.ts            ID, ISODateString, Currency ('GTQ' literal), UserRole
      entities/<entidad>/  Un DTO + Model + Mapper por entidad (ver "Contrato de datos" abajo)
    utils/
      currency.ts          formatCurrency — única función de formato de moneda
      date.ts               formatDateGT/formatTimeGT/formatStayRange/calculateNights — únicas de fecha
  services/                Cliente HTTP y servicios transversales (capa de datos, ver "Servicios" abajo)
  assets/                  Imágenes, fuentes e iconos propios
  styles/
    tokens.css             Única fuente de tokens de diseño (color, tipografía, espaciado, radios)
  index.css                Hoja de estilos global heredada del prototipo Bolt (ver nota al final)
  app/router.tsx           Configuración explícita de React Router
  app/routes.ts             Catálogo tipado y constantes de rutas
```

## Reglas de capas

- Una vista sin sesión se crea en `public/pages/`.
- Una vista autenticada se crea en `private/pages/`; su lógica de negocio se
  consume desde el módulo correspondiente.
- Todo lo específico de un dominio se coloca en `modules/<modulo>/`.
- Solo código reutilizable por dos o más áreas debe estar en `shared/`.
- Auth vive en `modules/auth/`; su proveedor envuelve el router desde `main.tsx`.
  El login está en `public/pages/StaffLoginPage.tsx`. Las guardas y el catálogo
  de navegación por permiso se mantienen en `private/guards/` y `private/routes/`.
  La fachada de auth consume `services/authService.ts`. Consultar
  `modules/auth/README.md` para el contrato y la política de permisos.
- El catálogo de UI está en `public/pages/ComponentsCatalogPage.tsx` (ruta
  `/components`); sus ejemplos asíncronos viven en `modules/ui-catalog/`. Los
  primitivos están en `shared/components/` y consumen tokens desde
  `styles/tokens.css`.
- `TableFrame` en `shared/components/DataTable.tsx` es el único renderizador
  de tablas del árbol.

## Contrato de datos: DTO → Mapper → Model

**Este contrato es compartido con la app móvil (`pms-hotel-mobile`): la web
es la fuente de verdad, móvil lo consume y no lo redefine.** El documento de
referencia — pensado para leerse sin abrir este código — es
[`docs/CONTRATO-DATOS.md`](../docs/CONTRATO-DATOS.md): ahí están las
veintitrés entidades del barrel con su DTO/Model/ejemplo JSON, las máquinas
de estado, qué debe replicar móvil (MOV-04) y las decisiones de equipo
pendientes (formato de SKU — [D-004](../docs/DECISIONES.md), catálogo de
categorías — [D-005](../docs/DECISIONES.md), tipo de ID, la máquina de
estado de `room` vs. el flujo de limpieza que móvil necesita). Cualquier
cambio a una entidad compartida se anuncia a ambos equipos antes de tocar
código — ver la sección 7 de ese documento.

Nueve de esas entidades llegaron con los Lotes C (WEB-11: `guest-account`,
`deposit`, `cash-session`, `cash-movement`) y D (WEB-12: `role`,
`permission`, `inventory-item`, `inventory-movement`, `audit-log`) — ver
`PROGRESO-MOCKS.md`. `role.code` corresponde por valor (no por FK) con
`user.role`, ver [D-003](../docs/DECISIONES.md), ya aceptada.

Cada entidad vive en `shared/types/entities/<entidad>/`, con cuatro
archivos: `<entidad>.dto.ts` (forma cruda, snake_case, tal como la devolvería
una API real), `<entidad>.model.ts` (forma de dominio, camelCase, la que
consume la UI), `<entidad>.mapper.ts` (`toDomain`/`toDTO`, el único punto que
conoce ambas formas) e `index.ts` (reexporta los tres). Es **una sola
definición por entidad** — hasta el cierre de la Fase 0 convivían un archivo
plano (`entities/<x>.ts`, camelCase, sin distinción real DTO/Model) y esta
carpeta oficial; el plano se eliminó. `order` y `service-request` (Room
Service y limpieza/conserjería, las entidades que móvil opera y la web
cobra) siguen el mismo patrón.

`room-type` referencia `room_feature` (características de habitación, sin
horario), nunca `amenity` (servicios del hotel, con horario): son entidades
distintas a propósito — ver [`docs/DECISIONES.md`, D-001](../docs/DECISIONES.md).

Los literales de estado y sus transiciones válidas (`room`, `booking`,
`order`, `service_request`) viven en `shared/constants/statuses.ts`, para
que móvil use exactamente los mismos nombres.

**El estado de `room` son dos campos con dueños distintos, no uno:**
`status` (ocupación, la controla la web) y `housekeepingStatus` (limpieza,
la controla la app móvil). La asignabilidad se consulta con
`isRoomAssignable()`, nunca reimplementada en una pantalla — ver
[`docs/DECISIONES.md`, D-002](../docs/DECISIONES.md). Cualquier cambio a
esto pasa por una entrada nueva en ese documento.

`shared/types/entities/index.ts` es un barrel de **tipos únicamente**:
`toDomain`/`toDTO` no se reexportan ahí porque las veintitrés entidades
usan exactamente esos dos nombres y colisionarían. Importar un mapper
siempre desde la ruta específica de su entidad:

```ts
import { toDomain as toBooking } from '@/shared/types/entities/booking';
```

**`shared/types/entities/session/` es un caso aparte, y no se reexporta desde
el barrel.** Modela la respuesta de login/sesión (`SessionUserDTO`,
`AuthResponseDTO`, `AuthSession`, `LoginDTO`) con el rol de acceso al PMS
(`UserRole` de `common.ts`: ADMIN/RECEPTIONIST/MANAGER/STAFF). Es un concepto
distinto de `shared/types/entities/user/`, que modela el puesto de un
empleado en el directorio de personal
(admin/manager/frontDesk/housekeeping/maintenance, alineado con la app
móvil). Comparten nombre por casualidad, no por ser la misma entidad; no
fusionarlos. Ver `modules/auth/README.md`.

## Moneda y fecha

- **Moneda:** quetzal guatemalteco. `Currency` (`shared/types/common.ts`) es
  el literal `'GTQ'`, no una unión de monedas. Todo campo de dinero en un DTO
  termina en `_cents` (`total_amount_cents`, `price_cents`, `amount_cents`) y
  es un entero — nunca un decimal. `formatCurrency` (`shared/utils/currency.ts`)
  es la única función de formato; ninguna pantalla escribe `Q` a mano.
- **Fecha:** `formatDateGT` da `dd-mm-aaaa`, `formatTimeGT` da `HH:mm` en 24
  horas (`shared/utils/date.ts`). Un DTO distingue fecha civil (`"YYYY-MM-DD"`,
  sin hora ni zona: check-in, check-out, vigencias) de timestamp (ISO 8601
  completo: `created_at`, `updated_at`). Ninguna pantalla formatea fechas por
  su cuenta.

## Servicios y regla de oro

Ningún componente ni pantalla importa `src/data/db.ts` directamente — todo
pasa por un servicio en `services/`. Cada servicio es `async`, devuelve
Models (nunca DTOs), simula una latencia de 300 a 600 ms
(`services/mockUtils.ts`) y puede forzarse a fallar
(`mockUtils.setForceError(true)`, o `?mockError=true`/`PMS_FORCE_MOCK_ERROR`
en `localStorage`) para probar el manejo de errores.

`src/data/db.ts` es la única "base de datos" simulada del proyecto: un
array exportado por entidad (`bookingsDB`, `roomsDB`, `usersDB`, etc.),
organizado por secciones (sesión de autenticación, Lote B, Lote C, Lote D,
y `order`/`service_request`, que WEB-09 definía sin dataset propio hasta
esta consolidación). Reemplaza a `services/mockData.ts`,
`services/authMockData.ts` y `shared/mocks/{lot-b,lot-c,lot-d}.ts`, que
antes coexistían con IDs de mundos distintos que no se cruzaban entre sí
(p. ej. `paymentService` leía `mockData.ts` mientras `guestAccountService`
ya leía el dataset real de pagos del Lote C). `bookingService`,
`roomService`, `guestService`, `paymentService` y `catalogService` leen de
ahí (Lote B/C/D); igual `guestAccountService`/`cashService` (Lote C) y
`personnelService`/`inventoryService`/`auditService` (Lote D).
`authService.ts` es el único servicio con persistencia (sesión en
`localStorage`) y cliente HTTP (`services/http-client.ts`, listo para una
API real pero sin uso todavía). Única excepción documentada a "un solo
archivo con datos inventados": el fixture de demo de
`src/modules/ui-catalog/services/catalog-service.ts`, que no representa
ninguna entidad del contrato y existe solo para renderizar `/components`.

## Pruebas

`npm run test` corre once suites (`scripts/*.mjs`), todas con el mismo
patrón: esbuild empaqueta el módulo a probar a CommonJS y se ejecuta con
`node --test` — sin ningún framework de pruebas externo.

| Suite                            | Qué cubre                                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `test-auth.mjs`                  | Sesión, roles, guardas de ruta, 404 por área (14 pruebas)                                                        |
| `test-currency.mjs`              | `formatCurrency` (11 pruebas)                                                                                    |
| `test-date.mjs`                  | `formatDateGT`/`formatTimeGT`/`calculateNights`/mappers de fecha civil (35 pruebas)                              |
| `test-money-contract.mjs`        | `mockData.ts`: montos enteros, `currency: 'GTQ'`, sufijo `_cents` (13 pruebas)                                   |
| `test-contract.mjs`              | Una sola definición por entidad, incluidas las nueve de los Lotes C/D (29 pruebas)                               |
| `test-shared-contract.mjs`       | Fechas ISO, `_cents`, estados dentro de `statuses.ts`, `guest_link_code` único, mappers sin pérdida (37 pruebas) |
| `test-referential-integrity.mjs` | Ninguna referencia queda colgada entre lotes (bookings, guests, users, cuentas, caja, inventario) (64 pruebas)   |
| `test-room-status.mjs`           | Separación `status`/`housekeepingStatus` de `room`, `isRoomAssignable()` (9 pruebas)                             |
| `test-lot-c-d.mjs`               | Aritmética de cuentas/caja/inventario, horario de amenidades, cobertura de casos (WEB-11/WEB-12) (15 pruebas)    |
| `test-services.mjs`              | Los servicios son `async`, con latencia simulada, devuelven Models, forzado de error, regla de oro (7 pruebas)   |
| `test-presentation.mjs`          | Primitivos de `shared/components/` y el catálogo `/components` (6 pruebas)                                       |

Total: 240 pruebas. `npm run check` encadena
`format:check && typecheck && lint && build && test`.

## `index.css`: pendiente de separar

`src/index.css` (heredado del prototipo Bolt) mezcla en un solo archivo
estilos base que la app real usa hoy (`.button`, `.content`, `.eyebrow`,
`.public-page-shell`, `body`) con estilos que solo aplicaban a las pantallas
de Bolt ya eliminadas (`src/app/App.tsx` y `src/components/`, retirados en el
cierre de la Fase 0). No se separó en ese cierre porque varias de esas reglas
en uso real dependen de variables `--*-legacy-*` de `tokens.css`, y no hay
forma mecánica de distinguir qué alias son solo del árbol muerto sin trazar
selector por selector — es trabajo de análisis, no una poda. Pendiente como
ticket aparte.
