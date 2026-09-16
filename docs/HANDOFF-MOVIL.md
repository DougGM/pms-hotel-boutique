# Traspaso del contrato de datos a `pms-hotel-mobile`

**Para:** quien construye la app móvil (PGC36).
**De:** equipo web (`pms-hotel-boutique`), rama `docs/handoff-movil`, sobre `develop`.
**Fecha:** 2026-09-16.

Este documento está escrito para que puedas empezar a trabajar el contrato de
datos de móvil **sin abrir el repositorio de la web**. Cada afirmación indica
el archivo de donde sale. Cuando algo solo existe en un documento y no en el
código (o al revés), lo digo explícitamente — en este proyecto ya pasó que
una decisión documentada nunca se implementó, y no quiero repetir ese
patrón aquí.

**Contexto que cambia el tono de este informe:** no es un traspaso a alguien
que empieza de cero. MOV-04 (diseño del contrato de datos) se escribió
**antes** de que la web publicara el suyo, así que móvil ya tiene su propia
definición de varias de estas entidades — construida en paralelo, no
después. Este documento es una **reconciliación entre dos contratos que ya
existen**, no una especificación para implementar desde cero. La sección 5
tiene una subsección completa de **divergencias probables** para que las
verifiques una por una contra tu código.

---

## 1 · Resumen para empezar mañana

**Ya está decidido y no se negocia:** la web (`pms-hotel-boutique`) es la
fuente de verdad del contrato de datos. Diez entidades te conciernen
directamente: `room`, `room-type`, `room-feature`, `guest`, `booking`,
`product`, `amenity`, `user`, `order`, `service-request`. Cada una tiene
DTO (snake_case) → Mapper → Model (camelCase) en
`src/shared/types/entities/<entidad>/` en la web, con datos reales en
`src/data/db.ts` que puedes copiar para tus propios fixtures/tests. Las
máquinas de estado y sus transiciones válidas viven en
`src/shared/constants/statuses.ts` — cópialas literal, mismo naming
camelCase.

**Podés empezar hoy, sin esperar a nadie, en:**

- Replicar la forma Model (camelCase) de las 10 entidades de la sección 3 —
  los campos y tipos ya están fijos y verificados contra el código real.
- Las 5 máquinas de estado de la sección 4 (`room` × 2, `booking`, `order`,
  `service_request`) — literales y transiciones exactos, con test de
  contrato en la web que los protege.
- El patrón `dd-mm-aaaa` vs. ISO 8601 para fechas, y `_cents` entero para
  dinero — reglas cerradas, sin ambigüedad.
- La regla de quién escribe qué en `room`: vos escribís
  `housekeepingStatus`, la web escribe `status` (ocupación) — nunca al
  revés.

**Está bloqueado por decisiones pendientes (no arranques suponiendo un
valor):**

- **Cómo se autentica el personal en la app móvil.** No está en el
  contrato de datos — es una pregunta abierta, textual en
  `docs/CONTRATO-DATOS.md` sección 3.12, y confirmé que no hay ningún
  mecanismo de auth de personal implementado en la web que puedas copiar
  (la web solo tiene login de empleados vía `sessionAccountsDB`, un
  concepto que el propio contrato dice que móvil no necesita replicar).
  Ver sección 7.
- **Formato de SKU y taxonomía de categorías** (`product.sku`,
  `product.category`, `amenity.category`, la nueva
  `inventory_item.category`) — marcados como provisionales en
  `docs/DECISIONES.md` D-004 y D-005. Los valores actuales en el dataset
  (`MIN-0001`, `PRD-001`...) pueden cambiar.
- **La conexión real entre un pedido/solicitud entregado y el cargo que
  genera.** El campo `charge_id` existe en el contrato, pero **verifiqué
  que ningún código en la web lo llena nunca** — ni un servicio, ni el
  propio dataset mock (ningún `order` en `delivered` ni `service_request`
  en `completed` tiene `charge_id` poblado). Ver sección 5 y 7.

---

## 2 · Reglas que móvil hereda y no negocia

| Regla | Por qué |
|---|---|
| **Todo identificador de código en inglés**; español solo en texto visible al usuario y en `.md`. | `CLAUDE.md` (web) lo fija así para todo el proyecto; `docs/CONTRATO-DATOS.md` sección 2 lo repite para el contrato compartido — consistencia entre los dos repos, no solo dentro de uno. |
| **DTO en snake_case, Model en camelCase, un Mapper como único punto que conoce ambas formas.** | Así está implementado en las 23 entidades de `src/shared/types/entities/` — verificado leyendo `dto.ts`/`model.ts`/`mapper.ts` de cada una para este informe. Ningún componente de la web importa un DTO directamente. |
| **Dinero: todo campo termina en `_cents`, entero, nunca decimal; `currency` es el literal `'GTQ'`, no una unión abierta.** | `Currency` está cerrado a `'GTQ'` en `src/shared/types/common.ts:3`. `formatCurrency` (`src/shared/utils/currency.ts:24`) rechaza con `throw` cualquier `amountCents` no entero — no es una convención de estilo, hay una guarda en tiempo de ejecución. |
| **Fechas: ISO 8601 completo para timestamp (`created_at`, `updated_at`...), `"YYYY-MM-DD"` sin hora para fecha civil (`check_in`, `check_out`...); `dd-mm-aaaa` es solo de presentación, nunca de transporte.** | `src/shared/types/common.ts:36-56` (`toDomainCalendarDate`) tiene una guarda explícita, con comentario, contra `new Date(value)` directo sobre una fecha civil: desplaza el día según la zona horaria del proceso que lee (Guatemala es UTC-6). Si tu capa de red en RN hace el mismo `new Date("2026-09-10")` sin cuidado, vas a desplazar el día. |
| **Los literales de estado y sus transiciones válidas salen de un único archivo (`shared/constants/statuses.ts`), nunca reimplementados en una pantalla.** | La web tiene una prueba estática (`scripts/test-room-status.mjs`, según su comentario en `statuses.ts:52`) que falla si algún archivo fuera de ese archivo compara `status === 'available'` junto con `housekeepingStatus`. El mismo principio aplica a tu código: la fuente de los literales y transiciones es ese archivo, no una reinterpretación tuya. |
| **Regla de oro de acceso a datos: nada por fuera del contrato accede al dataset simulado directamente — todo pasa por un servicio async con latencia simulada.** | `src/services/*.ts` — verifiqué `roomService`, `bookingService`, `guestService`, `catalogService`, `guestAccountService`, `paymentService`, `personnelService`: los siete siguen el mismo patrón (`await simulateLatency(); mockUtils.throwIfSimulatingError(...); return db.map(toDomain)`). No aplica literal a móvil (tu app no importa `src/data/db.ts` de la web), pero sí aplica el principio: tu propia capa de datos debe tener el mismo único punto de acceso, para que el día que haya una API real el cambio sea local a esa capa. |

---

## 3 · Entidades, una por una

Para cada una: campos del DTO con tipo, forma del Model, un ejemplo real
**copiado de `src/data/db.ts`** (no inventado), y si móvil la lee, la
escribe, o ambas. Encontré 23 entidades en total en
`src/shared/types/entities/` (22 en el barrel + `session`, aparte); listo
acá las 10 que te conciernen y resumo el resto en la sección 3.11.

### 3.1 `room` — móvil lee `status`, escribe `housekeepingStatus`

Fuente: `src/shared/types/entities/room/room.dto.ts`,
`room.model.ts`, `room.mapper.ts`.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `room_number` | `string` | |
| `room_type_id` | `string` | FK a `room-type` |
| `floor` | `number` | |
| `status` | `'available' \| 'occupied' \| 'maintenance' \| 'out_of_service'` | Ocupación. **La escribe la web. Móvil solo lee.** |
| `housekeeping_status` | `'dirty' \| 'cleaning' \| 'clean' \| 'inspected'` | Limpieza. **La escribe móvil.** |
| `notes?` | `string` | |
| `created_at` / `updated_at` | `string` (timestamp) | |

Model (`room.model.ts:5-23`): mismo campos en camelCase
(`roomNumber`, `roomTypeId`, `housekeepingStatus`), `status` traduce
`out_of_service → outOfService`, fechas como `Date`, más un campo
**calculado por el mapper que no existe en el DTO**:

- `isAssignable: boolean` — `true` solo si `status === 'available'` **y**
  `housekeepingStatus` es `'clean'` o `'inspected'`. Lo calcula
  `isRoomAssignable()` en `src/shared/constants/statuses.ts:67-72`. Si
  necesitás saber si una habitación se puede ofrecer, usá este campo —
  **no reimplementes la comparación**; la web tiene una prueba estática
  que vigila justamente eso del lado suyo, y tu código debería aplicar el
  mismo criterio (mismo `room_feature`/`amenity` que consultás igual).

Ejemplo real (`src/data/db.ts:225-234`):

```json
{
  "id": "RM-101",
  "room_number": "101",
  "room_type_id": "RT-01",
  "floor": 1,
  "status": "available",
  "housekeeping_status": "clean",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-09-07T00:00:00.000Z"
}
```

**Lee y escribe** (campos distintos, dueños distintos — no es la misma
mitad de la entidad).

### 3.2 `room-type` — móvil solo lee

Fuente: `src/shared/types/entities/room-type/*.ts`.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `code` | `string` | `"EST"`, `"DLX"`... |
| `name` | `string` | |
| `description?` | `string` | |
| `capacity` | `number` | Huéspedes máximos |
| `bed_configuration` | `string` | Texto libre |
| `room_feature_ids` | `string[]` | FK a `room-feature` — **nunca** a `amenity` |
| `active` | `boolean` | |
| `created_at` / `updated_at` | `string` | |

Model: mismos campos camelCase (`bedConfiguration`, `roomFeatureIds`).

Ejemplo real (`src/data/db.ts:162-173`):

```json
{
  "id": "RT-01",
  "code": "EST",
  "name": "Estándar",
  "description": "Habitación acogedora para una estancia práctica y tranquila.",
  "capacity": 2,
  "bed_configuration": "1 cama matrimonial",
  "room_feature_ids": ["RF-01", "RF-02", "RF-03"],
  "active": true,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

**Solo lee.**

### 3.3 `room-feature` — móvil solo lee

Fuente: `src/shared/types/entities/room-feature/*.ts`. Característica de
la habitación (aire acondicionado, balcón...), **entidad distinta de
`amenity`** — ver sección 5.5. Sin horario, sin `active`/`inactive`.

| Campo DTO | Tipo |
|---|---|
| `id` | `string` |
| `name` | `string` |
| `description?` | `string` |
| `created_at` / `updated_at` | `string` |

Ejemplo real (`src/data/db.ts:117-123`):

```json
{
  "id": "RF-01",
  "name": "Aire acondicionado",
  "description": "Climatización individual controlable desde la habitación.",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

**Solo lee.**

### 3.4 `guest` — móvil solo lee

Fuente: `src/shared/types/entities/guest/*.ts`.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `first_name` / `last_name` | `string` | |
| `email?` / `phone?` / `nationality?` | `string` | |
| `document_type?` | `'passport' \| 'national_id' \| 'driver_license'` | Model: `'passport' \| 'nationalId' \| 'driverLicense'` — el mapper traduce las dos variantes con guion bajo, `passport` queda igual |
| `document_number?` | `string` | |
| `notes?` | `string` | |
| `created_at` / `updated_at` | `string` | |

Ejemplo real (`src/data/db.ts:380-391`):

```json
{
  "id": "GST-001",
  "first_name": "Ana Lucía",
  "last_name": "López Cifuentes",
  "email": "ana.lopez@example.com",
  "phone": "+502 4210-6832",
  "nationality": "Guatemalteca",
  "document_type": "national_id",
  "document_number": "2451 77890 0101",
  "created_at": "2026-01-03T00:00:00.000Z",
  "updated_at": "2026-01-03T00:00:00.000Z"
}
```

**Solo lee.**

### 3.5 `booking` — móvil solo lee (crítica: acá vive el código de vinculación)

Fuente: `src/shared/types/entities/booking/*.ts`.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `confirmation_code` | `string` | Identifica la reserva ante recepción — **no** es el código que teclea el huésped |
| `guest_link_code` | `string` | **El código de vinculación del huésped (MOV-14). Ver sección 5.2.** |
| `guest_id` | `string` | |
| `room_id?` | `string` | Puede no estar asignada aún |
| `room_type_id` | `string` | |
| `rate_id?` | `string` | |
| `check_in` / `check_out` | `string` (fecha civil `YYYY-MM-DD`) | |
| `status` | `'pending' \| 'confirmed' \| 'checked_in' \| 'checked_out' \| 'cancelled' \| 'no_show'` | Ver sección 4 — la escribe la web, móvil no la transiciona |
| `adults` / `children` | `number` | |
| `total_amount_cents` | `number` (entero) | |
| `currency` | `'GTQ'` | |
| `notes?` | `string` | |
| `created_at` / `updated_at` | `string` | |

Ejemplo real (`src/data/db.ts:670-688`):

```json
{
  "id": "BKG-001",
  "confirmation_code": "AUR-26001",
  "guest_link_code": "LNK-26001",
  "guest_id": "GST-001",
  "room_id": "RM-101",
  "room_type_id": "RT-01",
  "rate_id": "RATE-01",
  "check_in": "2026-09-10",
  "check_out": "2026-09-12",
  "status": "pending",
  "adults": 2,
  "children": 0,
  "total_amount_cents": 130000,
  "currency": "GTQ",
  "notes": "Solicita habitación silenciosa.",
  "created_at": "2026-09-01T00:00:00.000Z",
  "updated_at": "2026-09-01T00:00:00.000Z"
}
```

**Solo lee.** La web es dueña de todo el ciclo de vida de la reserva
(confirmar, check-in, check-out, cancelar).

### 3.6 `product` — móvil solo lee (catálogo de Room Service)

Fuente: `src/shared/types/entities/product/*.ts`.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `sku` | `string` | **Formato provisional — ver sección 7** |
| `name` / `description?` | `string` | |
| `category` | `'minibar' \| 'shop' \| 'food_and_beverage' \| 'other'` | **Taxonomía provisional — ver sección 7** |
| `price_cents` | `number` (entero) | |
| `currency` | `'GTQ'` | |
| `stock_quantity` / `reorder_level` | `number` | |
| `active` | `boolean` | |
| `created_at` / `updated_at` | `string` | |

Ejemplo real (`src/data/db.ts:1821-1833`) — **distinto del ejemplo que
trae `docs/CONTRATO-DATOS.md` sección 3.5** (ver sección 8, contradicción
#2):

```json
{
  "id": "PRD-001",
  "sku": "MIN-0001",
  "name": "Agua mineral 600ml",
  "category": "minibar",
  "price_cents": 1500,
  "currency": "GTQ",
  "stock_quantity": 40,
  "reorder_level": 10,
  "active": true,
  "created_at": "2026-08-01T00:00:00.000Z",
  "updated_at": "2026-08-01T00:00:00.000Z"
}
```

**Solo lee.**

### 3.7 `amenity` — móvil solo lee (**tiene horario — ver sección 8, contradicción #1**)

Fuente: `src/shared/types/entities/amenity/*.ts`.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `name` / `description?` | `string` | |
| `category` | `'room' \| 'hotel' \| 'service'` | **Taxonomía provisional — ver sección 7** |
| `location?` | `string` | |
| `opens_at?` / `closes_at?` | `string` (`"HH:mm"`, 24h) | **Existe.** Ausentes en una amenidad de servicio continuo. `amenity.dto.ts:9-14` |
| `active` | `boolean` | |
| `created_at` / `updated_at` | `string` | |

Model agrega `opensAt?`/`closesAt?` (`amenity.model.ts:9-10`), sin ningún
campo calculado adicional — la disponibilidad por horario se calcula
aparte (ver abajo).

Ejemplo real (`src/data/db.ts:1723-1733`) — con horario poblado, no
como el ejemplo sin horario de `docs/CONTRATO-DATOS.md`:

```json
{
  "id": "AMN-01",
  "name": "Piscina",
  "description": "Piscina exterior climatizada.",
  "category": "hotel",
  "opens_at": "06:00",
  "closes_at": "20:00",
  "active": true,
  "created_at": "2026-08-01T00:00:00.000Z",
  "updated_at": "2026-08-01T00:00:00.000Z"
}
```

**Función de disponibilidad ya implementada** en
`src/shared/utils/amenitySchedule.ts:27-36` —
`isAmenityOpenAt(amenity, at)`: `true` si `at` cae dentro de
`[opens_at, closes_at)`; sin horario significa servicio continuo,
siempre `true`; soporta ventana que cruza medianoche (`22:00`–`02:00`).
Recibe la fecha de referencia como parámetro explícito, nunca
`Date.now()` internamente — replicá el mismo criterio del lado de móvil
para que el cálculo de "¿está abierta ahora?" (MOV-16) no dependa de a
qué hora corre tu build. Probado en `scripts/test-lot-c-d.mjs:182-236`
(tres casos: continua, ventana angosta, cruce de medianoche).

**Solo lee.**

### 3.8 `user` — móvil solo lee (puesto de personal, no rol de acceso)

Fuente: `src/shared/types/entities/user/*.ts`. Ver sección 5.4 para la
distinción con `session`, que **no** replicás.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `first_name` / `last_name` | `string` | |
| `email` | `string` | |
| `role` | `'admin' \| 'guest' \| 'reception' \| 'housekeeping' \| 'concierge' \| 'room_service'` | Model: `roomService` en vez de `room_service`, el resto igual |
| `status` | `'active' \| 'inactive'` | |
| `created_at` / `updated_at` | `string` | |

Ejemplo real (`src/data/db.ts:1477-1486`):

```json
{
  "id": "USR-001",
  "first_name": "Marcos",
  "last_name": "Ruano",
  "email": "marcos.ruano@hotelboutique.test",
  "role": "reception",
  "status": "active",
  "created_at": "2026-08-01T00:00:00.000Z",
  "updated_at": "2026-08-01T00:00:00.000Z"
}
```

Servida por `personnelService.getUsers()`/`getUserById()`
(`src/services/personnelService.ts:9-19`) — solo lectura, sin métodos de
escritura en la web tampoco.

**Solo lee.**

### 3.9 `order` — móvil opera de punta a punta (crítica)

Fuente: `src/shared/types/entities/order/*.ts`.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `booking_id` | `string` | Reserva a la que se carga el consumo |
| `room_id` | `string` | Habitación de entrega |
| `guest_id?` | `string` | Denormalizado por conveniencia |
| `items` | `{ product_id: string; quantity: number; unit_price_cents: number }[]` | **Snapshot de precio al momento del pedido** — no recalcules contra `product.price_cents` actual |
| `status` | 8 literales, ver sección 4 | Lo transiciona móvil |
| `notes?` | `string` | |
| `currency` | `'GTQ'` | |
| `charge_id?` | `string` | FK a `charge` (exclusiva de la web) — **ver sección 5.3, nunca se llena en el código actual** |
| `requested_at` / `created_at` / `updated_at` | `string` | |

Existe también `CreateOrderDto` (`order.dto.ts:43-49`:
`booking_id, room_id, guest_id?, items, notes?`) — pensado para el
`POST` que crearía un pedido nuevo, aunque **ningún servicio de la web lo
usa hoy** (ver sección 7).

Ejemplo real (`src/data/db.ts:2602-2617`):

```json
{
  "id": "ORD-001",
  "booking_id": "BKG-003",
  "room_id": "RM-301",
  "guest_id": "GST-003",
  "items": [
    { "product_id": "PRD-001", "quantity": 2, "unit_price_cents": 1500 },
    { "product_id": "PRD-007", "quantity": 1, "unit_price_cents": 1500 }
  ],
  "status": "pending",
  "notes": "Sin hielo en el agua.",
  "currency": "GTQ",
  "requested_at": "2026-09-09T20:15:00.000Z",
  "created_at": "2026-09-09T20:15:00.000Z",
  "updated_at": "2026-09-09T20:15:00.000Z"
}
```

**Lee y escribe** (móvil crea el pedido y lo transiciona por sus 8
estados; la web solo lo lee para facturar — y, según verifiqué, ni
siquiera eso está conectado todavía, ver sección 7).

### 3.10 `service-request` — móvil opera de punta a punta (crítica)

Fuente: `src/shared/types/entities/service-request/*.ts`. Mismo patrón
que `order`, sin productos: viaja un `type` y una `description` libre.

| Campo DTO | Tipo | Nota |
|---|---|---|
| `id` | `string` | |
| `booking_id` / `room_id` | `string` | |
| `guest_id?` | `string` | |
| `type` | `'housekeeping' \| 'concierge' \| 'maintenance' \| 'other'` | |
| `description` | `string` | Qué se solicita |
| `status` | 5 literales, ver sección 4 | Lo transiciona móvil |
| `notes?` | `string` | |
| `charge_id?` | `string` | Igual que en `order` — caso poco común (p. ej. un taxi que cobra conserjería); **tampoco se llena nunca en el código actual** |
| `requested_at` / `created_at` / `updated_at` | `string` | |

`CreateServiceRequestDto` también existe (`service-request.dto.ts:31-38`)
sin servicio que lo use.

Ejemplo real (`src/data/db.ts:2871-2882`):

```json
{
  "id": "SR-001",
  "booking_id": "BKG-003",
  "room_id": "RM-301",
  "guest_id": "GST-003",
  "type": "housekeeping",
  "description": "Toallas extra y almohadas adicionales",
  "status": "pending",
  "requested_at": "2026-09-09T21:00:00.000Z",
  "created_at": "2026-09-09T21:00:00.000Z",
  "updated_at": "2026-09-09T21:00:00.000Z"
}
```

**Lee y escribe.**

### 3.11 El resto: 13 entidades exclusivas de la web, ninguna te concierne

Verifiqué que existen (DTO real, no solo mencionadas en un documento) y
que ningún archivo fuera de `src/services/`/`src/shared/types/` las
referencia desde un módulo que móvil necesitaría espejar:

- **`rate`** (tarifa por tipo de habitación y vigencia) — `rate.dto.ts`.
- **`charge`** (cargo a la cuenta, destino de `order.charge_id`/
  `service_request.charge_id`) — `charge.dto.ts`. Servida por
  `guestAccountService.createCharge()`
  (`src/services/guestAccountService.ts:38-63`) — ver sección 5.3, es
  clave entender esta aunque no la repliques.
- **`payment`** — `payment.dto.ts`, servida por `paymentService.ts` y
  también por `guestAccountService.ts`.
- **`promotion`** — `promotion.dto.ts`.
- **`guest-account`, `deposit`, `cash-session`, `cash-movement`** (Lote
  C/WEB-11) — cuentas, depósitos y caja. Servidas por
  `guestAccountService.ts`/`cashService.ts`.
- **`role`, `permission`, `inventory-item`, `inventory-movement`,
  `audit-log`** (Lote D/WEB-12) — catálogo de permisos, inventario
  operativo, auditoría. Servidas por `personnelService.ts`,
  `inventoryService.ts`, `auditService.ts`.

Todas verificadas por su archivo `.dto.ts` durante la investigación de
este informe — existen y su forma coincide con lo que dice
`docs/CONTRATO-DATOS.md` secciones 3.10/3.10b/3.10c, con la única
salvedad de los ejemplos JSON desactualizados que señalo en la sección 8.

**Fuera del contrato por completo, del lado de móvil:** `notification` y
`cart_item` — según `docs/CONTRATO-DATOS.md` sección 3.11, son conceptos
que solo existen en tu app (una notificación push local, un ítem de
carrito antes de confirmarse como `order`). No verifiqué esto contra
código porque, por definición, no hay código web que los modele — es una
afirmación de alcance, no de implementación.

---

## 4 · Máquinas de estado

Fuente única: `src/shared/constants/statuses.ts`. Los literales son los
del **Model** (camelCase); el DTO los traduce a snake_case en su mapper.

### `room` — ocupación (`RoomStatus`), la escribe **la web**

```
available    → occupied | maintenance | outOfService
occupied     → available | maintenance | outOfService
maintenance  → available | outOfService
outOfService → available | maintenance
```

(`statuses.ts:19-27`. `ROOM_STATUS_TRANSITIONS` no tiene ningún código en
la web que la aplique todavía como guarda explícita sobre `roomService` —
verifiqué `src/services/roomService.ts` y `updateRoom` hace
`Object.assign` directo sin validar contra esta tabla. Es la tabla de
referencia, pero ningún lado la hace cumplir por ahora.)

### `room` — limpieza (`RoomHousekeepingStatus`), la escribe **móvil**

```
dirty     → cleaning
cleaning  → clean
clean     → inspected | dirty
inspected → dirty
```

(`statuses.ts:34-45`.) Esta es la máquina que vas a transicionar de punta
a punta en la experiencia de limpieza.

### `booking` (`BookingStatus`), la escribe la web

```
pending    → confirmed | cancelled | noShow
confirmed  → checkedIn | cancelled | noShow
checkedIn  → checkedOut
checkedOut → (terminal)
cancelled  → (terminal)
noShow     → (terminal)
```

(`statuses.ts:81-98`.) Móvil no la transiciona nunca — solo la lee para
mostrarle al huésped el estado de su estadía.

### `order` (`OrderStatus`), la escribe **móvil**

```
pending   → accepted | rejected | cancelled
accepted  → preparing | cancelled
preparing → ready
ready     → onTheWay
onTheWay  → delivered
delivered → (terminal)
rejected  → (terminal)
cancelled → (terminal)
```

(`statuses.ts:104-125`.) Cancelable solo en `pending`/`accepted`.
Verificado con prueba de contrato en
`scripts/test-shared-contract.mjs:242-263` (los literales del dataset
coinciden con `ORDER_STATUSES`, y cada registro pertenece a esa lista).

### `service_request` (`ServiceRequestStatus`), la escribe **móvil**

```
pending    → accepted | rejected
accepted   → inProgress
inProgress → completed
completed  → (terminal)
rejected   → (terminal)
```

(`statuses.ts:130-148`.) Mismo patrón de prueba de contrato en
`scripts/test-shared-contract.mjs:265-284`.

### Exclusivas de la web (no las transicionás, pero podés necesitarlas de contexto)

`guest_account` (`open → closed`), `deposit` (`held → refunded | applied`),
`cash_session` (`open → closed`) — `statuses.ts:156-196`. Ninguna se
reabre; un ajuste posterior es un registro nuevo.

---

## 5 · Los puntos donde web y móvil se tocan

### 5.1 Estado de habitación: dos campos, dos dueños

Ya cubierto en detalle en la sección 3.1 y en la máquina de la sección 4.
La regla que importa retener: **una habitación `available` con
`housekeeping_status: 'dirty'` no es asignable**, aunque su ocupación
diga que está libre — es el caso exacto que motivó separar los dos
campos (`docs/DECISIONES.md`, D-002). Consultá siempre `isAssignable`
del Model; nunca reconstruyas la comparación en tu código.

### 5.2 El código de vinculación de reserva (`guest_link_code`)

Vive en `booking.guest_link_code` (DTO) / `booking.guestLinkCode`
(Model) — `booking.dto.ts:15`. Formato actual en el dataset:
`"LNK-26001"`, `"LNK-26002"`... (prefijo `LNK-` + año + secuencia de 3
dígitos), generado por `bookingService.createBooking()`
(`src/services/bookingService.ts:75`):
`` `LNK-${String(bookingsDB.length + 1).padStart(4, '0')}` `` — en la
práctica hoy produce `LNK-0011`, `LNK-0012`... para reservas nuevas
creadas en la sesión (el dataset sembrado usa el patrón de año que se
ve arriba; el generador en código usa un contador simple, no el año —
son dos formatos ligeramente distintos dentro del mismo repo, señalado
en la sección 8).

**Verifiqué que no existe ningún método de servicio en la web que busque
una reserva por `guest_link_code`** (`grep` de `guest_link_code`/
`guestLinkCode` fuera de los archivos de contrato y de
`bookingService.createBooking` no devuelve nada) — solo hay
`getBookingById` (por `id`, no por el código). Esto importa para vos: la
pantalla de "ingresar código" que describe tu plan (bienvenida del
huésped) necesita un lookup por `guest_link_code`, y ese lookup **no
tiene ninguna implementación de referencia en la web hoy**, ni mock ni
real. Es un hueco — ver sección 7.

Regla de negocio (documentada, no verificable en código porque no hay
código de generación de `confirmation_code` vs. `guest_link_code` que
compare ambos): son dos campos distintos a propósito.
`confirmation_code` identifica la reserva ante recepción/el huésped en
general; `guest_link_code` es específicamente el secreto que vincula la
app móvil a esa estadía. Móvil **nunca genera** este código, solo lo
valida contra lo que la web emitió.

### 5.3 Pedidos y solicitudes: cómo se conecta un pedido entregado con un cargo

**Esto es lo más importante de verificar antes de construir MOV-08 y
los tickets de facturación de consumo.** Lo que encontré:

1. El contrato tiene el campo para la conexión: `order.charge_id?` /
   `service_request.charge_id?`, ambos FK a `charge`
   (`charge.dto.ts:5-20`, campo `product_id?` en `charge` para cuando el
   cargo viene de un producto de Room Service).
2. La web tiene un servicio que **puede** crear ese cargo:
   `guestAccountService.createCharge(data: CreateChargeDto)`
   (`src/services/guestAccountService.ts:38-63`). Recibe
   `booking_id, product_id?, description, quantity, unit_price_cents,
   currency, charged_at?, created_by_user_id?`, calcula
   `amount_cents = quantity * unit_price_cents`, exige que la cuenta de
   la reserva esté `status: 'open'`, y **suma el monto al
   `balance_cents` guardado de la cuenta** (`guestAccountService.ts:59-60`).
3. **Pero nada llama a `createCharge` cuando un `order` pasa a
   `delivered` ni cuando un `service_request` pasa a `completed`.**
   Busqué cualquier código que lea `ordersDB`/`serviceRequestsDB` fuera
   de los archivos de contrato — no existe ningún `orderService` ni
   `serviceRequestService` en `src/services/`. El único lugar donde
   `OrderDto`/`ServiceRequestDto` se usan es su propio contrato y el
   dataset mock.
4. Confirmé en el dataset mismo que la conexión nunca se ejercitó ni
   ahí: de las 20 órdenes en `ordersDB`, **13 están en `delivered`** y
   **ninguna tiene `charge_id` poblado** (`grep` de `charge_id` en el
   rango completo de `ordersDB`, `src/data/db.ts:2601-2869`, cero
   resultados). Mismo patrón en `serviceRequestsDB`: de 19 solicitudes,
   varias `completed`, cero con `charge_id`.

**Conclusión para tu plan:** el campo existe, el servicio que
técnicamente podría poblarlo existe, pero **la conexión event-driven
("cuando móvil marca delivered, algo en la web llama a createCharge y
escribe `charge_id` de vuelta") no está implementada en ningún lado, ni
en código de producción ni en el dataset de referencia.** No asumas que
podés copiar un flujo de referencia — hay que construirlo, y hay que
decidir juntos si lo dispara un evento desde móvil (¿un webhook?, ¿un
polling de la web?) o si recepción lo hace manualmente desde una
pantalla web que tampoco existe todavía. Ver sección 7.

### 5.4 `session` frente a `user`: dos roles, dos ciclos de vida

Verificado en tres archivos: `src/shared/types/entities/session/*.ts`,
`src/shared/types/entities/user/*.ts`, `src/shared/types/common.ts`.

- **`session`** (`SessionUserDTO`, `session.dto.ts:9-16`) modela la
  respuesta de login de la web: **el rol de acceso al PMS**. Su campo
  `role` tipa contra `UserRole` de `common.ts:6-7`:
  `'ADMIN' | 'GUEST' | 'RECEPTION' | 'HOUSEKEEPING' | 'CONCIERGE' |
  'ROOM_SERVICE'` — **mayúsculas**. Decide qué pantallas/permisos ve una
  sesión autenticada en la web (`src/modules/auth/models/session.ts`).
- **`user`** (`UserDTO`, `user.dto.ts:5-14`) modela **el puesto de un
  empleado** en el directorio de personal. Su campo `role` tipa contra
  `UserRoleDto` de `user.dto.ts:1-2`:
  `'admin' | 'guest' | 'reception' | 'housekeeping' | 'concierge' |
  'room_service'` — **minúsculas**, snake_case donde aplica.

Son dos tipos con **el mismo nombre de campo (`role`), la misma forma de
seis roles, pero dos conjuntos de literales distintos** (mayúsculas vs.
minúsculas) — comparten concepto de negocio pero son tipos TypeScript
diferentes, deliberadamente, según el comentario en
`session.dto.ts:3-8` y `docs/CONTRATO-DATOS.md` sección 3.12.

**Según ese mismo documento, tu plan (MOV-04) solo necesita replicar
`user`** (el puesto, para mostrar quién es el personal asignado a una
tarea) — **no necesitás replicar `session`**. La razón que da el
documento: la experiencia de personal en móvil "presumiblemente tendrá
su propio mecanismo de autenticación", y la experiencia de huésped no
usa login (se vincula con `guest_link_code`). Repito la frase textual
del documento porque es información, no una decisión tomada: **"Cómo se
autentica el personal en la app móvil no está resuelto por este
contrato."** Confirmé que no hay ningún código adicional que lo
resuelva. Ver sección 7 — es el hueco más importante de todo este
informe.

**Debés replicar la misma separación conceptual** aunque tu mecanismo de
autenticación termine siendo distinto: no fusiones "el puesto de un
empleado" con "qué puede hacer en tu app" en un solo tipo, por la misma
razón que la web no lo hizo.

### 5.5 Característica de habitación frente a amenidad de hotel

Ya tocado en 3.2/3.3/3.7. La regla dura, verificada en código y no solo
en el documento: `room-type.room_feature_ids` (`room-type.dto.ts:14`)
referencia **únicamente** `room-feature`; no existe ningún campo
`amenity_ids` en `room` ni en `room-type` (`grep` de `amenity_id` en
`room.dto.ts`/`room-type.dto.ts` no devuelve nada). Si tu pantalla de
huésped necesita mostrar "qué amenidades tiene el hotel", leé del
catálogo `amenity` directo — nunca a través de un tipo de habitación.
Contexto de por qué se separaron: `docs/DECISIONES.md`, D-001.

---

## 6 · Qué cambia en el plan de móvil

**Limitación que tengo que decir de entrada: no tengo acceso al
repositorio `pms-hotel-mobile` ni a la lista real de los 22 tickets
MOV-01 a MOV-22** — la consigna de este informe pide revisarlos uno por
uno, pero eso requeriría leer ese repositorio, y las reglas de esta
tarea dicen explícitamente que no puedo. Lo que sigue es el análisis con
lo que sí es verificable: los tickets que se nombraron por número en el
contexto que tengo (MOV-04, MOV-08, MOV-14, MOV-16), y el impacto por
**área funcional** según la descripción de las dos fases de tu plan
(personal primero, huésped después). Marcá cada punto contra tu backlog
real — no asumas que esta lista es exhaustiva ni que los números que no
menciono no cambian.

### Lo que sí puedo decir con números concretos

- **MOV-04 (diseño del contrato de datos) cambia de naturaleza, no
  desaparece.** Se escribió para *diseñar* el contrato porque en ese
  momento no existía ninguno del lado web. Hoy existe, verificado campo
  por campo en este informe. El ticket pasa de "diseñar" a **"replicar y
  reconciliar"**: su criterio de aceptación ya no es "definir los DTO/
  Model de room, booking, etc." sino "verificar que el contrato propio
  de móvil coincide con el de la sección 3 de este informe, y ajustar
  las divergencias que encuentres." Es menos trabajo de diseño, pero
  necesita una pasada de reconciliación campo por campo que MOV-04
  original no tenía en su alcance.
- **MOV-08 (ya construido, según tu corrección) incluye "el módulo de
  tareas con bandeja genérica y transiciones de estado".** Dado que
  `order` (8 estados) y `service_request` (5 estados) tienen máquinas de
  estado **distintas** (verificado en la sección 4 — no son la misma
  cantidad de literales ni las mismas transiciones), si esa bandeja
  genérica asume una sola máquina de estado compartida, hay que
  verificar que soporte las dos tablas de transición por separado, no
  una unificada. Vale la pena revisar el código ya escrito de MOV-08
  contra las tablas exactas de la sección 4 antes de dar por bueno que
  "ya soporta transiciones de estado" en el sentido que la web necesita.
- **MOV-14 (código de vinculación) tiene el campo confirmado
  (`guest_link_code`) pero el lookup por código no tiene implementación
  de referencia** — ver sección 5.2. Este ticket no está bloqueado por
  una decisión pendiente, pero sí necesita que alguien en la web
  construya (o ambos equipos decidan) el endpoint/servicio de búsqueda
  por código antes de que MOV-14 pueda probarse contra algo real.
- **MOV-16 (¿está abierta la amenidad ahora?) está más avanzado de lo
  que el contrato documentado sugiere.** `docs/CONTRATO-DATOS.md` dice
  que `amenity` "no tiene horario de funcionamiento todavía" — verifiqué
  que eso es falso contra el código actual (sección 8, contradicción
  #1). El campo y la función de cálculo ya existen y están probados. Este
  ticket probablemente se simplifica: no hay que esperar una decisión de
  equipo para el horario en sí, solo replicar `opensAt`/`closesAt` y el
  criterio de `isAmenityOpenAt` (sección 3.7).

### Impacto por área, sin número de ticket (verificá contra tu backlog)

- **Fase personal — limpieza:** todo lo que toque `room.housekeepingStatus`
  y su máquina de 4 estados debe usar exactamente esos literales
  camelCase; el campo de ocupación (`room.status`) se muestra de
  solo-lectura, nunca con una acción que lo cambie.
- **Fase personal — room service:** el módulo que reciba y avance
  pedidos necesita las 8 transiciones exactas de `OrderStatus`, y
  depende de que se resuelva la conexión de facturación de la sección
  5.3 antes de poder cerrar el ciclo completo (recibir → entregar →
  facturar).
- **Fase personal — conserjería:** mismo patrón que room service pero con
  `ServiceRequestStatus` (5 estados, no 8) y sin `items`/`product_id` —
  es una descripción libre, no un carrito.
- **Fase huésped — vincular reserva:** bloqueada operativamente hasta que
  exista el lookup por `guest_link_code` (sección 5.2).
- **Fase huésped — ver datos de estadía:** puede construirse ya, sobre
  `booking`+`guest`+`room`+`room-type`, todos de solo lectura y ya
  verificados.
- **Fase huésped — amenidades:** puede construirse ya (sección 3.7 y
  MOV-16 arriba).
- **Fase huésped — pedir room service / solicitar limpieza o
  artículos:** depende de que exista un servicio real de escritura para
  `order`/`service_request` — hoy solo hay el contrato de datos, no la
  capa de servicio (`CreateOrderDto`/`CreateServiceRequestDto` no tienen
  ningún consumidor, sección 3.9/3.10 y sección 7).
- **Fase huésped — notificaciones:** fuera del contrato compartido por
  completo (`notification` es de móvil, sección 3.11); nada que
  reconciliar con la web.

---

## 7 · Huecos y bloqueos

Para cada uno: qué verifiqué, qué ticket de móvil bloquea, qué hay que
decidir.

### 7.1 Autenticación de personal en la app móvil — bloquea toda la fase 1

**Verificado:** no existe. Busqué cualquier mecanismo de login/sesión de
personal fuera de `src/modules/auth/` (que es específicamente el login
web de escritorio) y no encontré nada pensado para un dispositivo móvil
de planta (ej. PIN corto, QR de turno, biometría). El propio
`docs/CONTRATO-DATOS.md` sección 3.12 lo marca como pregunta abierta con
esas palabras exactas. No es que la respuesta esté escondida en otro
archivo — verifiqué que genuinamente no está decidida.

**Bloquea:** toda la fase 1 (limpieza, room service, conserjería) necesita
saber quién es el usuario autenticado en el dispositivo antes de poder
asignarle una tarea o registrar quién hizo qué.

**Hay que decidir:** el mecanismo (¿reutiliza `sessionAccountsDB` de la
web con un login liviano?, ¿un PIN propio de móvil sin relación con el
login web?, ¿un token de dispositivo asignado por turno?) — es una
decisión de producto y de seguridad, no algo que se pueda inferir del
contrato de datos actual.

### 7.2 Formato de SKU — provisional, D-004

**Verificado:** `docs/DECISIONES.md` D-004 lo marca explícitamente como
"pendiente — valor provisional en uso". El dataset real usa
`MIN-0001`…`MIN-0008` (minibar), `FYB-0001`…(comida y bebida),
`SHP-0001`…(tienda), `OTH-0001`…(otro) para `product.sku`, y
`INV-0001`…`INV-0010` para `inventory_item.sku` (catálogo separado, no
te concierne). Verifiqué que ningún test de contrato en la web valida
el formato con una expresión regular — a propósito, según el comentario
en D-004, para no congelar una decisión no tomada.

**Bloquea:** cualquier pantalla de móvil que valide o parsee el SKU
(p. ej. para agrupar por prefijo) — el formato puede cambiar.

**Hay que decidir:** una de las tres opciones que ya evalúa
`docs/CONTRATO-DATOS.md` sección 6.1 (texto libre, prefijo+secuencia —
el actual, o código opaco). No lo decidas del lado de móvil por tu
cuenta.

### 7.3 Taxonomía de categorías — provisional, D-005

**Verificado:** tres taxonomías **independientes y sin mapeo entre
sí**, confirmado leyendo los tres DTO: `ProductCategoryDto` (`minibar |
shop | food_and_beverage | other`, `product.dto.ts:3`),
`AmenityCategoryDto` (`room | hotel | service`, `amenity.dto.ts:1`),
`InventoryItemCategoryDto` (`room_service | housekeeping | maintenance |
office`, `inventory-item.dto.ts:1` — no te concierne, pero confirma el
patrón). `docs/DECISIONES.md` D-005 documenta que un mismo producto de
Room Service que también es artículo de inventario puede tener **dos
categorías que dicen cosas distintas del mismo objeto**, a propósito,
mientras no se decida lo contrario.

**Bloquea:** cualquier pantalla de móvil que necesite agrupar productos
en secciones de menú (p. ej. "Bebidas", "Snacks", "Postres") — esas
secciones no existen en ninguna de las tres taxonomías actuales.

**Hay que decidir:** `docs/CONTRATO-DATOS.md` sección 6.2 recomienda un
campo `menu_section` independiente de `category`, pero **no está
implementado** — es una recomendación, no una decisión tomada ni un
campo que exista en el DTO actual. Verifiqué que `menu_section` no
aparece en `product.dto.ts` ni en ningún otro archivo del repo.

### 7.4 Conexión pedido/solicitud entregado → cargo — sin implementación de referencia

Desarrollado en detalle en la sección 5.3. Repito solo el resumen:
**bloquea** cualquier ticket de "facturar el consumo de Room Service/
conserjería" hasta que alguien (web, móvil, o ambos coordinando) decida
y construya el mecanismo — no hay código de referencia que copiar hoy.

### 7.5 Servicio de escritura para `order`/`service_request` — no existe

**Verificado:** ni `orderService.ts` ni `serviceRequestService.ts`
existen en `src/services/`. `CreateOrderDto`/`CreateServiceRequestDto`
están definidos en el contrato pero cero archivos los importan fuera de
su propio módulo de tipos (`grep` de ambos nombres en todo `src`
devuelve solo las definiciones). El dataset mock (`ordersDB`,
`serviceRequestsDB`) existe y tiene datos realistas, pero nada en la web
lee ni escribe ahí a través de un servicio.

**Bloquea:** cualquier intento de usar la web como "servidor de
referencia" real para probar el flujo completo de un pedido — hoy esa
capa solo existe como datos estáticos, no como comportamiento.

**Hay que decidir:** si la web va a construir esta capa de servicio
(aunque sea mock) antes de que móvil la necesite como referencia, o si
móvil construye su propio backend/mock sin esperar a la web para esta
parte específica — dado que la web es la fuente del *contrato de datos*,
no necesariamente de la *implementación de servicio* para estas dos
entidades.

### 7.6 Lookup de reserva por `guest_link_code` — no existe

Ver sección 5.2. **Bloquea** la pantalla de vinculación del huésped
(entrada de código). **Hay que decidir/construir:** el método de
servicio equivalente a `getBookingById` pero por `guest_link_code`.

### 7.7 ¿Falta algún campo que móvil necesite y la web no tenga?

Repasé las pantallas descritas en tu plan (limpieza: marcar habitaciones,
atender solicitudes, reportar desperfectos; room service: recibir/avanzar
pedidos, cargar consumo; conserjería: atender solicitudes; huésped:
vincular, ver estadía, amenidades, pedir, solicitar, seguir estado,
notificaciones) contra los campos verificados en la sección 3. Dos
huecos adicionales a los ya listados:

- **"Reportar desperfectos" (limpieza)** no tiene un tipo claro en el
  contrato actual. `service_request.type` incluye `'maintenance'`
  (`service-request.dto.ts:12`), así que un desperfecto reportado por
  limpieza probablemente es un `service_request` con
  `type: 'maintenance'` — pero esto es una inferencia mía, no algo que
  el contrato diga explícitamente en ningún lado. Confirmalo con el
  equipo antes de asumirlo.
- **No hay campo de "asignado a" (`assigned_to_user_id` o similar) en
  `order` ni en `service_request`.** Verificado: ninguno de los dos DTO
  tiene un campo que registre qué miembro del personal está atendiendo
  la tarea. Si tu "bandeja genérica" de MOV-08 necesita mostrar
  asignación por persona, ese campo no existe en el contrato — es un
  candidato a agregar siguiendo el procedimiento de la sección 9, no
  algo que puedas inferir de otro campo existente.

---

## 8 · Contradicciones detectadas

Dos contradicciones directas entre documentación y código, más dos
inconsistencias menores dentro del propio código. Ninguna la resolví por
mi cuenta — quedan acá para que el equipo decida cuál de las dos partes
(documento o código) está desactualizada.

### Contradicción #1 — `amenity` sí tiene horario de funcionamiento

`docs/CONTRATO-DATOS.md` sección 3.6 dice, textual: *"No tiene horario de
funcionamiento todavía a pesar de ser un servicio compartido — es una
limitación conocida, no algo que este documento resuelva."*

Verifiqué que esto es falso contra el código actual:

- `amenity.dto.ts:9-14` tiene `opens_at?`/`closes_at?`.
- `amenity.model.ts:9-10` los expone como `opensAt?`/`closesAt?`.
- `amenity.mapper.ts:11-12,24-25` los traduce en ambas direcciones.
- `src/shared/utils/amenitySchedule.ts` implementa `isAmenityOpenAt()`
  completo, con soporte de ventana que cruza medianoche.
- `src/data/db.ts:1722-1820` (`amenitiesDB`) tiene horario poblado en
  la mayoría de los registros (`AMN-01` a `AMN-0N`).
- `scripts/test-lot-c-d.mjs:182-236` prueba la función con tres casos.
- `src/ARCHITECTURE.md:204` incluso lista "horario de amenidades" como
  parte de lo que cubre `test-lot-c-d.mjs` — el propio archivo de
  arquitectura ya sabe que existe, mientras `CONTRATO-DATOS.md` (un
  documento distinto) todavía dice que no.

Como pediste explícitamente no resolver esto por mi cuenta: no sé si
`docs/CONTRATO-DATOS.md` quedó desactualizado después de que se
implementó el horario, o si hay alguna razón para no considerarlo "listo"
que no logré encontrar en el código. Alguien del equipo web debería
actualizar esa sección del documento o explicar la reserva.

### Contradicción #2 — Los ejemplos JSON de `docs/CONTRATO-DATOS.md` no coinciden con el dataset real para `product`, `amenity`, `order` y `service_request`

El documento usa IDs con formato `"product-1"`, `"amenity-1"`,
`"order-1"`, `"service-request-1"`. El dataset real en `src/data/db.ts`
usa `"PRD-001"`, `"AMN-01"`, `"ORD-001"`, `"SR-001"` — prefijos por
entidad, no el patrón `entidad-número` del documento. Verificado
comparando línea por línea las secciones 3.5/3.6/3.8/3.9 de
`docs/CONTRATO-DATOS.md` contra `src/data/db.ts:1820-1833` (product),
`1722-1733` (amenity), `2601-2617` (order), `2870-2882`
(service_request).

Para `room`, `room-type`, `room-feature`, `guest` y `booking`, en
cambio, verifiqué que los ejemplos del documento **sí** coinciden
exactamente con el dataset real — no es un problema generalizado, es
específico de estas cuatro entidades (probablemente las que se
agregaron o regeneraron después de que se escribió esa parte del
documento). No corregí los ejemplos en `CONTRATO-DATOS.md` — usé los
reales, verificados, en la sección 3 de este informe.

### Inconsistencia menor #1 — `SessionUserDTO.createdAt` es camelCase, no snake_case

`session.dto.ts:15` declara `createdAt: ISODateString` dentro de una
interfaz que el propio comentario del archivo llama "DTO" y que
representa la respuesta cruda de login. El resto del contrato es
consistente en que un DTO es snake_case (`created_at`, no `createdAt`)
— esta es la única excepción que encontré revisando las 23 entidades.
No es necesariamente un error: `session` está marcada aparte del resto
del contrato (`docs/CONTRATO-DATOS.md` sección 3.12) y quizás por eso no
sigue la misma convención a propósito. Como no tengo forma de confirmar
la intención, lo dejo señalado en vez de asumir.

### Inconsistencia menor #2 — El formato real de `guest_link_code` generado no coincide con el del dataset sembrado

Ver sección 5.2: el dataset sembrado usa `LNK-26001` (con año), pero
`bookingService.createBooking()` (`src/services/bookingService.ts:75`)
genera códigos nuevos como `LNK-0011` (contador simple, sin año). Mismo
patrón en `confirmation_code` (`PMS-0011` generado vs. `AUR-26001`
sembrado). No es una contradicción documento-vs-código — es una
inconsistencia dentro del código mismo, entre los datos de arranque y lo
que el servicio genera en vivo. No debería afectar a móvil (solo
consumís el valor, cualquiera sea su formato), pero lo señalo porque si
alguna pantalla de móvil llegara a validar el formato del código con una
expresión regular basada en el dataset sembrado, fallaría contra
reservas creadas después del arranque.

---

## 9 · Cómo se cambia el contrato

Copiado de `docs/CONTRATO-DATOS.md` sección 7, porque es exactamente el
procedimiento que aplica si tu equipo necesita un campo nuevo — **móvil
no modifica su copia del contrato por su cuenta**:

1. **Proponer el cambio** en un issue que describa el campo/entidad/
   estado nuevo y quién lo necesita (web, móvil, o ambos).
2. **Anunciarlo a los dos equipos** antes de tocar código — el propósito
   de `docs/CONTRATO-DATOS.md` es que móvil no tenga que leer el código
   web, así que un cambio sin anuncio rompe esa promesa aunque el código
   compile.
3. **Un solo PR en la web** que actualice, junto: el DTO, el Model, el
   mapper, `shared/constants/statuses.ts` si agrega un estado, el
   dataset mock si aplica, la prueba de contrato correspondiente, y
   `docs/CONTRATO-DATOS.md`.
4. **Nunca quitar o renombrar un campo/literal existente** sin período de
   aviso — móvil puede estar leyendo la forma anterior. Agregar es
   seguro; quitar/renombrar requiere coordinar una fecha de corte.
5. **Actualizar la fecha de "Última actualización"** al inicio de
   `docs/CONTRATO-DATOS.md` en el mismo commit.

Para los huecos de la sección 7 específicamente (SKU, categorías,
autenticación de personal, conexión de facturación, lookup por código):
son decisiones de **equipo**, no de un solo lado — proponelas en la
misma sesión conjunta donde se resuelvan D-004/D-005, no las decidas
unilateralmente desde móvil aunque tengas la urgencia de un ticket
bloqueado.
