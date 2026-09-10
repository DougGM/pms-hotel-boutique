# Arquitectura del Frontend

```text
src/
  public/                 Vistas disponibles sin sesión
    page.tsx              Entrada pública
    pages/                Páginas públicas adicionales (incluye el catálogo de UI, /components)
  private/                Vistas autenticadas de empleados y administración
    page.tsx              Layout con menú principal
    pages/                Páginas privadas que combinan módulos
    guards/                RequireSession, RequirePermission
    routes/                Catálogo de navegación privada por permiso
  layouts/                Layouts conectados a React Router
  pages/                  Páginas base conectadas a las rutas (LoginPage, OperationsHomePage, PublicHomePage)
  modules/
    auth/                 Sesión de personal: modelos, mappers, servicios (fachada) y componentes
    ui-catalog/            Ejemplos asíncronos del catálogo de componentes
  shared/
    components/           Button, Input, Select, Modal, DatePickerRange, Card, Badge,
                           EmptyState, LoadingState, ErrorState, DataTable (TableFrame), Pagination
    constants/
      statuses.ts          Literales y transiciones de estado compartidos con la app móvil
                           (room, booking, order, service_request) — ver "Contrato de datos" abajo
    mocks/                 lot-b.ts: dataset del Lote B (habitaciones, huéspedes, reservas, tarifas, promociones)
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
[`docs/CONTRATO-DATOS.md`](../docs/CONTRATO-DATOS.md): ahí están las catorce
entidades con su DTO/Model/ejemplo JSON, las máquinas de estado, qué debe
replicar móvil (MOV-04) y las decisiones de equipo pendientes (formato de
SKU, catálogo de categorías, tipo de ID, la máquina de estado de `room` vs.
el flujo de limpieza que móvil necesita). Cualquier cambio a una entidad
compartida se anuncia a ambos equipos antes de tocar código — ver la
sección 7 de ese documento.

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

`shared/types/entities/index.ts` es un barrel de **tipos únicamente**:
`toDomain`/`toDTO` no se reexportan ahí porque las catorce entidades usan
exactamente esos dos nombres y colisionarían. Importar un mapper siempre
desde la ruta específica de su entidad:

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

Ningún componente ni pantalla importa `shared/mocks/` o `services/mockData.ts`
directamente — todo pasa por un servicio en `services/`. Cada servicio es
`async`, devuelve Models (nunca DTOs), simula una latencia de 300 a 600 ms
(`services/mockUtils.ts`) y puede forzarse a fallar
(`mockUtils.setForceError(true)`, o `?mockError=true`/`PMS_FORCE_MOCK_ERROR`
en `localStorage`) para probar el manejo de errores.

`bookingService`, `roomService` y `guestService` leen de
`shared/mocks/lot-b.ts` (el dataset del Lote B: habitaciones, huéspedes,
reservas, tarifas). `paymentService` y `catalogService` leen de
`services/mockData.ts`, que no tiene el volumen de `lot-b.ts` porque cubre
entidades que ningún ticket ha poblado todavía a fondo (pagos, productos,
amenidades — WEB-11/WEB-12). `authService.ts` es el único servicio con
persistencia (sesión en `localStorage`) y cliente HTTP
(`services/http-client.ts`, listo para una API real pero sin uso todavía).

## Pruebas

`npm run test` corre ocho suites (`scripts/*.mjs`), todas con el mismo
patrón: esbuild empaqueta el módulo a probar a CommonJS y se ejecuta con
`node --test` — sin ningún framework de pruebas externo.

| Suite                      | Qué cubre                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `test-auth.mjs`            | Sesión, roles, guardas de ruta, 404 por área (14 pruebas)                                                        |
| `test-currency.mjs`        | `formatCurrency` (11 pruebas)                                                                                    |
| `test-date.mjs`            | `formatDateGT`/`formatTimeGT`/`calculateNights`/mappers de fecha civil (35 pruebas)                              |
| `test-money-contract.mjs`  | `mockData.ts`: montos enteros, `currency: 'GTQ'`, sufijo `_cents` (13 pruebas)                                   |
| `test-contract.mjs`        | Una sola definición por entidad (incluye `order`/`service-request`); `lot-b.ts` en centavos y GTQ (19 pruebas)   |
| `test-shared-contract.mjs` | Fechas ISO, `_cents`, estados dentro de `statuses.ts`, `guest_link_code` único, mappers sin pérdida (22 pruebas) |
| `test-services.mjs`        | Los servicios son `async`, con latencia simulada, devuelven Models, forzado de error, regla de oro (7 pruebas)   |
| `test-presentation.mjs`    | Primitivos de `shared/components/` y el catálogo `/components` (6 pruebas)                                       |

`npm run check` encadena `format:check && typecheck && lint && build && test`.

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
