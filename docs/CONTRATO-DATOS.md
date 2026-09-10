# Contrato de datos — PMS Hotel Boutique

**Última actualización:** 2026-09-09 · rama `feat/contrato-compartido`.

## 1. Propósito y regla de gobierno

Este documento es el contrato de datos que comparten los dos repositorios del
PMS:

- **`pms-hotel-boutique` (web)** — motor de reservas público y operación
  privada (recepción, administración, caja, inventario, reportes).
- **`pms-hotel-mobile` (móvil)** — app React Native con experiencia de
  personal (limpieza, room service, conserjería) y experiencia de huésped
  (estadía, pedidos, solicitudes).

**La web es la fuente de verdad del contrato.** Define cada entidad como
DTO (snake_case) → Mapper → Model (camelCase) en
`src/shared/types/entities/<entidad>/`. Móvil **consume este contrato y no
lo redefine**: si móvil necesita un campo o un estado que no existe aquí, se
agrega aquí primero. Ningún cambio de campo, tipo o literal de estado se
hace en silencio — se anuncia a ambos equipos antes de tocar código (ver
sección 7).

Este documento está escrito para que quien lo lea no tenga que abrir el
código de la web.

## 2. Convenciones

- **Idioma:** todo identificador (archivo, variable, campo, tipo) en inglés.
  Español solo en texto visible al usuario y en documentación (`.md`).
- **DTO vs. Model:** el DTO es snake_case y es la forma que devolvería una
  API real; el Model es camelCase y es la forma que consume la UI. Un
  mapper (`toDomain`/`toDTO`) es el único punto que conoce ambas formas.
- **Moneda:** quetzal guatemalteco. Todo campo de dinero en un DTO termina
  en `_cents` y es un **entero** (nunca decimal). `currency` es el literal
  `'GTQ'` (`shared/types/common.ts`), nunca una unión de monedas ni un
  `string` suelto.
- **Fechas — transporte vs. presentación:**
  - _Timestamp_ (`created_at`, `updated_at`, `charged_at`, `paid_at`,
    `requested_at`): ISO 8601 completo con hora y zona,
    p. ej. `"2026-09-10T09:30:00.000Z"`.
  - _Fecha civil_ (`check_in`, `check_out`, `valid_from`, `valid_to`): ISO
    8601 sin hora, `"YYYY-MM-DD"`, p. ej. `"2026-09-10"`. Nunca
    `new Date(value)` directo sobre un string de solo fecha — desplaza el
    día según la zona horaria del proceso que lo lee. Usar
    `toDomainCalendarDate`/`toDtoCalendarDate` (o el equivalente que móvil
    implemente del mismo lado).
  - **`dd-mm-aaaa` es exclusivamente de presentación.** Ningún DTO ni
    dataset lo usa; lo produce `formatDateGT` (`shared/utils/date.ts`) al
    mostrarlo en pantalla. Un DTO nunca lleva una fecha ya formateada para
    humanos.
- **IDs:** `string` en todo el contrato (`ID` en `shared/types/common.ts`).
  Tratarlos como opacos — nunca parsear ni comparar numéricamente (ver
  decisión pendiente 6.3).

## 3. Entidad por entidad

Para cada entidad: si es compartida (ambos proyectos la leen) o exclusiva de
un lado, los campos del DTO, la forma del Model, y un ejemplo real.

### 3.1 `room` — compartida

Habitación física del hotel.

| Campo DTO       | Tipo                                                                                | Descripción                                            |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `id`            | `string`                                                                            | Identificador opaco                                     |
| `room_number`   | `string`                                                                            | Número visible al personal (`"101"`)                    |
| `room_type_id`  | `string`                                                                            | FK a `room-type`                                        |
| `floor`         | `number`                                                                            | Piso                                                     |
| `status`        | `'available' \| 'occupied' \| 'cleaning' \| 'maintenance' \| 'out_of_service'`      | Disponibilidad/servicio — ver sección 4 y decisión 6.4  |
| `notes?`        | `string`                                                                            | Nota libre                                               |
| `created_at`    | `string` (timestamp)                                                                |                                                           |
| `updated_at`    | `string` (timestamp)                                                                |                                                           |

Model: igual en camelCase (`roomNumber`, `roomTypeId`), `status` con
`out_of_service → outOfService`, fechas como `Date`.

```json
{
  "id": "RM-101",
  "room_number": "101",
  "room_type_id": "RT-01",
  "floor": 1,
  "status": "available",
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-09-07T00:00:00.000Z"
}
```

### 3.2 `room-type` — compartida (de facto)

No estaba en la lista original de entidades cruzadas de la consigna, pero
`room`/`booking` dependen de ella para capacidad/descripción/amenidades, y
móvil las necesita para mostrarle al huésped el tipo de su habitación. Se
recomienda tratarla como compartida.

| Campo DTO           | Tipo       | Descripción                          |
| -------------------- | ---------- | ------------------------------------- |
| `id`                 | `string`   |                                        |
| `code`               | `string`   | Código corto (`"EST"`, `"DLX"`)       |
| `name`               | `string`   |                                        |
| `description?`       | `string`   |                                        |
| `capacity`           | `number`   | Huéspedes máximos                     |
| `bed_configuration`  | `string`   | Texto libre                           |
| `amenity_ids`        | `string[]` | FKs a `amenity` — ver decisión 6.5    |
| `active`             | `boolean`  |                                        |
| `created_at`         | `string`   |                                        |
| `updated_at`         | `string`   |                                        |

```json
{
  "id": "RT-01",
  "code": "EST",
  "name": "Estándar",
  "description": "Habitación acogedora para una estancia práctica y tranquila.",
  "capacity": 2,
  "bed_configuration": "1 cama matrimonial",
  "amenity_ids": ["AM-01", "AM-02", "AM-03"],
  "active": true,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
```

### 3.3 `guest` — compartida

| Campo DTO          | Tipo                                                    | Descripción             |
| ------------------- | -------------------------------------------------------- | ------------------------ |
| `id`                | `string`                                                 |                           |
| `first_name`        | `string`                                                 |                           |
| `last_name`         | `string`                                                 |                           |
| `email?`            | `string`                                                 |                           |
| `phone?`            | `string`                                                 |                           |
| `nationality?`      | `string`                                                 |                           |
| `document_type?`    | `'passport' \| 'national_id' \| 'driver_license'`        |                           |
| `document_number?`  | `string`                                                 |                           |
| `notes?`            | `string`                                                 |                           |
| `created_at`        | `string`                                                 |                           |
| `updated_at`        | `string`                                                 |                           |

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

### 3.4 `booking` — compartida (crítica)

Reserva de un huésped. `guest_link_code` es el campo que agrega este
contrato (FASE 2.3): el código que el huésped teclea en la app móvil para
vincularse a su estadía (ticket MOV-14). La web lo genera al crear/confirmar
la reserva. Es distinto de `confirmation_code`, que identifica la reserva
ante recepción.

| Campo DTO             | Tipo                                                                                          | Descripción                              |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `id`                    | `string`                                                                                        |                                             |
| `confirmation_code`     | `string`                                                                                        | Identifica la reserva ante recepción       |
| `guest_link_code`       | `string`                                                                                        | **Nuevo.** Código de vinculación (MOV-14)  |
| `guest_id`              | `string`                                                                                        |                                             |
| `room_id?`              | `string`                                                                                        | Puede no estar asignada aún                |
| `room_type_id`          | `string`                                                                                        |                                             |
| `rate_id?`              | `string`                                                                                        |                                             |
| `check_in`              | `string` (fecha civil)                                                                          |                                             |
| `check_out`             | `string` (fecha civil)                                                                          |                                             |
| `status`                | `'pending' \| 'confirmed' \| 'checked_in' \| 'checked_out' \| 'cancelled' \| 'no_show'`         | Ver sección 4                              |
| `adults`                | `number`                                                                                        |                                             |
| `children`              | `number`                                                                                        |                                             |
| `total_amount_cents`    | `number` (entero)                                                                               |                                             |
| `currency`              | `'GTQ'`                                                                                         |                                             |
| `notes?`                | `string`                                                                                        |                                             |
| `created_at`            | `string`                                                                                        |                                             |
| `updated_at`            | `string`                                                                                        |                                             |

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

### 3.5 `product` — compartida

| Campo DTO         | Tipo                                                            | Descripción              |
| ------------------ | ------------------------------------------------------------------ | -------------------------- |
| `id`               | `string`                                                            |                             |
| `sku`               | `string`                                                            | Ver decisión pendiente 6.1 |
| `name`              | `string`                                                            |                             |
| `description?`      | `string`                                                            |                             |
| `category`          | `'minibar' \| 'shop' \| 'food_and_beverage' \| 'other'`             | Ver decisión pendiente 6.2 |
| `price_cents`       | `number` (entero)                                                   |                             |
| `currency`          | `'GTQ'`                                                             |                             |
| `stock_quantity`    | `number`                                                            |                             |
| `reorder_level`     | `number`                                                            |                             |
| `active`            | `boolean`                                                           |                             |
| `created_at`        | `string`                                                            |                             |
| `updated_at`        | `string`                                                            |                             |

```json
{
  "id": "product-1",
  "sku": "AGUA-600ML",
  "name": "Agua mineral",
  "description": "Botella de 600 ml",
  "category": "minibar",
  "price_cents": 1500,
  "currency": "GTQ",
  "stock_quantity": 24,
  "reorder_level": 6,
  "active": true,
  "created_at": "2026-01-10T12:00:00.000Z",
  "updated_at": "2026-01-10T12:00:00.000Z"
}
```

### 3.6 `amenity` — compartida

| Campo DTO       | Tipo                                        | Descripción              |
| ---------------- | --------------------------------------------- | -------------------------- |
| `id`              | `string`                                      |                             |
| `name`            | `string`                                      |                             |
| `description?`    | `string`                                      |                             |
| `category`        | `'room' \| 'hotel' \| 'service'`             | Ver decisión pendiente 6.2 |
| `location?`       | `string`                                      |                             |
| `active`          | `boolean`                                     |                             |
| `created_at`      | `string`                                      |                             |
| `updated_at`      | `string`                                      |                             |

```json
{
  "id": "amenity-1",
  "name": "Wi-Fi",
  "description": "Internet inalámbrico",
  "category": "hotel",
  "active": true,
  "created_at": "2026-01-10T12:00:00.000Z",
  "updated_at": "2026-01-10T12:00:00.000Z"
}
```

### 3.7 `user` — compartida (puesto de personal, no rol de acceso)

Ver sección 3.12 para la distinción con `session`.

| Campo DTO       | Tipo                                                                        | Descripción       |
| ---------------- | ------------------------------------------------------------------------------ | ------------------- |
| `id`              | `string`                                                                        |                     |
| `first_name`      | `string`                                                                        |                     |
| `last_name`       | `string`                                                                        |                     |
| `email`           | `string`                                                                        |                     |
| `role`            | `'admin' \| 'manager' \| 'front_desk' \| 'housekeeping' \| 'maintenance'`      | Puesto de trabajo   |
| `status`          | `'active' \| 'inactive'`                                                       |                     |
| `created_at`      | `string`                                                                        |                     |
| `updated_at`      | `string`                                                                        |                     |

```json
{
  "id": "user-1",
  "first_name": "Ana",
  "last_name": "Martínez",
  "email": "ana@hotelboutique.test",
  "role": "front_desk",
  "status": "active",
  "created_at": "2026-01-10T12:00:00.000Z",
  "updated_at": "2026-01-10T12:00:00.000Z"
}
```

### 3.8 `order` — compartida (crítica, **nueva** en este PR)

Pedido de Room Service. Móvil lo opera (el personal marca el avance);
la web lo cobra: al entregarse, el consumo se carga a la cuenta del
huésped vía `charge_id`. Si web y móvil divergen aquí, el cargo no se
puede generar.

| Campo DTO         | Tipo                                                                                                                    | Descripción                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `id`                | `string`                                                                                                                     |                                                     |
| `booking_id`        | `string`                                                                                                                     | Reserva/estadía a la que se carga el consumo       |
| `room_id`           | `string`                                                                                                                     | Habitación de entrega                              |
| `guest_id?`         | `string`                                                                                                                     | Denormalizado por conveniencia                     |
| `items`             | `{ product_id: string; quantity: number; unit_price_cents: number }[]`                                                      | Snapshot de precio al momento del pedido           |
| `status`            | `'pending' \| 'accepted' \| 'preparing' \| 'ready' \| 'on_the_way' \| 'delivered' \| 'rejected' \| 'cancelled'`             | Ver sección 4                                      |
| `notes?`            | `string`                                                                                                                     |                                                     |
| `currency`          | `'GTQ'`                                                                                                                     |                                                     |
| `charge_id?`        | `string`                                                                                                                     | FK a `charge`, se llena al facturar                |
| `requested_at`      | `string`                                                                                                                     |                                                     |
| `created_at`        | `string`                                                                                                                     |                                                     |
| `updated_at`        | `string`                                                                                                                     |                                                     |

```json
{
  "id": "order-1",
  "booking_id": "BKG-001",
  "room_id": "RM-101",
  "guest_id": "GST-001",
  "items": [{ "product_id": "product-1", "quantity": 2, "unit_price_cents": 1500 }],
  "status": "on_the_way",
  "notes": "Entregar sin tocar la puerta.",
  "currency": "GTQ",
  "charge_id": null,
  "requested_at": "2026-09-10T09:30:00.000Z",
  "created_at": "2026-09-10T09:30:00.000Z",
  "updated_at": "2026-09-10T09:45:00.000Z"
}
```

### 3.9 `service_request` — compartida (crítica, **nueva** en este PR)

Solicitud de limpieza o conserjería. A diferencia de `order`, no lleva
productos: viaja un `type` y una `description` libre. `charge_id` cubre el
caso poco común de una solicitud que sí genera un cargo (p. ej. un taxi
reservado por conserjería).

| Campo DTO       | Tipo                                                                       | Descripción       |
| ---------------- | ------------------------------------------------------------------------------ | ------------------- |
| `id`              | `string`                                                                        |                     |
| `booking_id`      | `string`                                                                        |                     |
| `room_id`         | `string`                                                                        |                     |
| `guest_id?`       | `string`                                                                        |                     |
| `type`            | `'housekeeping' \| 'concierge' \| 'maintenance' \| 'other'`                    |                     |
| `description`     | `string`                                                                        | Qué se solicita     |
| `status`          | `'pending' \| 'accepted' \| 'in_progress' \| 'completed' \| 'rejected'`        | Ver sección 4       |
| `notes?`          | `string`                                                                        |                     |
| `charge_id?`      | `string`                                                                        |                     |
| `requested_at`    | `string`                                                                        |                     |
| `created_at`      | `string`                                                                        |                     |
| `updated_at`      | `string`                                                                        |                     |

```json
{
  "id": "service-request-1",
  "booking_id": "BKG-001",
  "room_id": "RM-101",
  "guest_id": "GST-001",
  "type": "housekeeping",
  "description": "Toallas extra",
  "status": "in_progress",
  "notes": "Huésped en la habitación después de las 3pm.",
  "requested_at": "2026-09-10T09:00:00.000Z",
  "created_at": "2026-09-10T09:00:00.000Z",
  "updated_at": "2026-09-10T09:10:00.000Z"
}
```

### 3.10 `rate`, `charge`, `payment`, `promotion` — exclusivas de la web

No las necesita móvil. Se listan solo por completitud del inventario:

- **`rate`**: tarifa por tipo de habitación y vigencia (`room_type_id`,
  `valid_from`/`valid_to`, `price_cents`, `minimum_nights`, `refundable`).
- **`charge`**: cargo a la cuenta de una reserva (`booking_id`,
  `product_id?`, `quantity`, `unit_price_cents`, `amount_cents`, `status`).
  Es el destino de `order.charge_id`/`service_request.charge_id`. Definida
  en el contrato desde antes de este PR, todavía sin servicio ni dataset
  propio — igual que `order`/`service_request` hasta ahora.
- **`payment`**: pago aplicado a una reserva (`booking_id`, `amount_cents`,
  `method`, `status`).
- **`promotion`**: código de descuento para el motor de reservas
  (`code`, `discount_percent`, `valid_from`/`valid_to`).

### 3.11 `notification`, `cart_item` — exclusivas de móvil

**No se definen en este contrato.** Según el reparto acordado, son
conceptos que solo existen en la app móvil (una notificación push local,
un ítem de carrito antes de confirmarse como `order`). Móvil los modela en
su propio repositorio; la web no los necesita y no debe crearlos aquí para
no inflar un contrato que no le pertenece.

### 3.12 `session` vs. `user` — no fusionar

Dos conceptos que comparten nombre por casualidad:

- **`shared/types/entities/session/`** modela la respuesta de login: el
  **rol de acceso al PMS** (`UserRole` en `common.ts`:
  `ADMIN | RECEPTIONIST | MANAGER | STAFF`), token, expiración. Es lo que
  decide qué pantallas/permisos ve un empleado autenticado en la web.
- **`shared/types/entities/user/`** modela el **puesto de un empleado** en
  el directorio de personal (`admin | manager | frontDesk | housekeeping |
  maintenance`), usado en catálogos/reportes.

Móvil, según su propio plan (MOV-04), solo necesita replicar `user` (el
puesto, para mostrar quién es el personal asignado a una tarea). No
necesita replicar `session` — la experiencia de personal en móvil
presumiblemente tendrá su propio mecanismo de autenticación, y la
experiencia de huésped no usa login en absoluto (se vincula con
`guest_link_code`). **Cómo se autentica el personal en la app móvil no
está resuelto por este contrato** — es una pregunta abierta para cuando se
escriba MOV-04 a fondo, no una decisión de datos.

## 4. Máquinas de estado

Definidas en `src/shared/constants/statuses.ts` (única fuente). Los
literales son los del **Model** (camelCase); el DTO los traduce a
snake_case en su mapper, igual que el resto del contrato.

### `room` (`RoomStatus`)

Literales tal cual los usa la web hoy — modelan disponibilidad/servicio,
no un flujo de limpieza (ver decisión pendiente 6.4).

```
available   → occupied | cleaning | maintenance | outOfService
occupied    → cleaning | maintenance | outOfService
cleaning    → available | maintenance | outOfService
maintenance → available | outOfService
outOfService→ available | maintenance
```

### `booking` (`BookingStatus`)

Literales tal cual los usa el dataset del Lote B. Ninguna capa de código
imponía estas transiciones antes de este contrato; se documentan como la
interpretación de dominio más directa.

```
pending    → confirmed | cancelled | noShow
confirmed  → checkedIn | cancelled | noShow
checkedIn  → checkedOut
checkedOut → (terminal)
cancelled  → (terminal)
noShow     → (terminal)
```

### `order` (`OrderStatus`) — nuevo

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

Cancelable solo en `pending` y `accepted`, tal como pedía el plan MOV-04.

### `service_request` (`ServiceRequestStatus`) — nuevo

```
pending   → accepted | rejected
accepted  → inProgress
inProgress→ completed
completed→ (terminal)
rejected → (terminal)
```

## 5. Qué debe replicar la app móvil (MOV-04)

Lista explícita, sin necesidad de leer código web:

1. **Entidades a replicar tal cual:** `room`, `room-type`, `guest`,
   `booking` (incluyendo `guest_link_code`), `product`, `amenity`, `user`,
   `order`, `service_request`. Todas con la forma de **Model** (camelCase)
   descrita en la sección 3 — móvil no necesita replicar la forma DTO si su
   propia capa de red ya hace su propia traducción snake_case → camelCase
   con la misma tabla de campos.
2. **Entidades que NO debe crear:** `rate`, `charge`, `payment`,
   `promotion`, `session` — no aplican al lado de móvil.
3. **Entidades propias de móvil, fuera de este contrato:** `notification`,
   `cart_item`.
4. **Literales de estado exactos** (sección 4): `RoomStatus`,
   `BookingStatus`, `OrderStatus`, `ServiceRequestStatus` — mismo naming
   camelCase, ninguna variante.
5. **Campos de dinero:** siempre `*_cents` entero en el transporte;
   `currency` siempre `'GTQ'`.
6. **Fechas:** ISO 8601 en el transporte (civil `YYYY-MM-DD` vs. timestamp
   completo, sección 2); la presentación al huésped/personal en pantalla es
   decisión de UI de móvil, no de este contrato — pero debe usar el mismo
   criterio civil-vs-timestamp para no desplazar días.
7. **Vinculación del huésped:** el flujo de "ingresar código" en la
   pantalla de bienvenida de la app usa `booking.guest_link_code` — móvil
   nunca lo genera, solo lo valida contra lo que la web emitió.
8. **Cierre del círculo de cobro:** cuando móvil marca un `order` o
   `service_request` como `delivered`/`completed`, la web es quien crea el
   `charge` correspondiente y llena `charge_id` — móvil no calcula montos,
   solo reporta el evento de estado.

## 6. Decisiones pendientes de equipo

Documentadas con recomendación, **no implementadas** en este PR.

### 6.1 Formato de SKU de inventario

**Problema:** los SKU actuales (`AGUA-600ML`, `SERV-EXPRESS`) son
inventados para el mock, sin esquema formal. El Lote D va a construir el
inventario real asumiendo lo que encuentre aquí.

**Opciones:**

- **A. Texto libre legible** (el actual): fácil de inventar, legible en
  recibos; sin garantía de unicidad ni de estructura, no valida por regex.
- **B. Prefijo por categoría + secuencia** (`MIN-0001`, `SHP-0002`,
  `FYB-0003`): ordenable, validable con un test de contrato simple, sigue
  siendo legible para el personal; requiere migrar los SKU existentes y
  mantener una tabla categoría→prefijo.
- **C. Código opaco (UUID/ULID) + `display_name`/código de barras aparte**:
  a prueba de colisiones, alineado con una integración real de inventario
  (EAN-13); exceso de complejidad para un inventario boutique pequeño, sin
  mnemónico legible sin una segunda consulta.

**Recomendación:** **B**. Da estructura suficiente para que el Lote D
valide SKUs con un test de contrato (similar a los que ya existen), sin la
sobreingeniería de C para un inventario de este tamaño. Decidir antes de
que el Lote D cargue datos reales — retrocorregir SKUs después de la carga
es más costoso que decidir el esquema ahora.

### 6.2 Catálogo de categorías de producto y amenidad

**Problema:** `ProductCategoryDto` (`minibar | shop | food_and_beverage |
other`) y `AmenityCategoryDto` (`room | hotel | service`) no tienen un
mapeo exacto a las secciones de menú que móvil necesita para agrupar Room
Service (p. ej. "Bebidas", "Snacks", "Postres" no existen hoy).

**Opciones:**

- **A. Mantener las categorías actuales** y que móvil las agrupe del lado
  cliente con etiquetas estáticas propias: cero cambios en la web; riesgo
  de que la taxonomía de menú diverja entre versiones de la app sin que la
  web lo sepa.
- **B. Expandir las categorías existentes** con subcategorías orientadas a
  menú (p. ej. dividir `food_and_beverage` en `beverage`/`food`/`dessert`):
  una sola taxonomía compartida; es un cambio disruptivo sobre un literal
  ya usado por datos existentes, y necesita decidir las categorías nuevas
  con criterio de UX, no de código.
- **C. Campo `menu_section` independiente** de `category`: separa
  "categoría de inventario" (para reportes/caja) de "cómo se agrupa en el
  menú" (para la UI de Room Service); requiere decidir quién es dueño de
  asignar `menu_section` a cada producto/amenidad.

**Recomendación:** **C** como punto de partida — no conviene forzar que la
categorización de inventario (útil para reportes y caja) cargue también con
la taxonomía de UX del menú de Room Service. El mapeo concreto
categoría→sección de menú es una decisión de producto que el equipo debe
tomar en la sesión, no algo que se pueda inferir del código actual.

### 6.3 Tipo de los identificadores de entidad

**Problema:** todo `id` en el contrato es `string` (`ID` en
`common.ts`), pero los datasets ya usan dos esquemas de slug distintos
(`booking-1` en `mockData.ts` vs. `BKG-001` en `lot-b.ts`). Si algún lado
decidiera cambiar a entero, cada llamada entre proyectos necesitaría
conversión.

**Opciones:**

- **A. Mantener `string` opaco** (el actual): sin riesgo de precisión
  numérica, compatible con UUID/ULID si el backend real los usa; requiere
  disciplina para no comparar/ordenar como número en ningún lado.
- **B. Migrar a entero**: payloads más pequeños, autoincremental natural
  para una base relacional; rompe el contrato completo (11+ entidades),
  colisiona con que `confirmation_code`/`guest_link_code` ya son
  inherentemente strings.

**Recomendación:** **A**. Un backend real emitirá casi con certeza
identificadores tipo UUID/ULID (string), y móvil ya trata los IDs como
claves opacas en su estado local — no hay beneficio funcional en migrar a
entero, solo costo de reescritura. Se recomienda declarar esto **cerrado**
salvo que el backend real fuerce lo contrario.

### 6.4 Máquina de estado de `room`: disponibilidad vs. flujo de limpieza

**Problema** (ya reportado en la sección 4 y en `statuses.ts`): el
`RoomStatus` actual de la web (`available/occupied/cleaning/maintenance/
outOfService`) responde "¿se puede vender la habitación?". El plan de
móvil (MOV-04) esperaba un flujo de limpieza (`dirty → cleaning → clean →
inspected`, cualquiera `→ blocked`) que responde "¿en qué paso de la
limpieza está?". Son preguntas distintas que pueden ser ciertas a la vez
(una habitación puede estar `occupied` y `dirty` simultáneamente).

**Opciones:**

- **A. Forzar un solo campo** con los literales de móvil: pierde la
  semántica de disponibilidad que ya usa la web (reportes de ocupación,
  bloqueo de venta).
- **B. Forzar un solo campo** con los literales actuales de la web: móvil
  pierde la granularidad del flujo de limpieza que necesita el personal de
  housekeeping.
- **C. Dos campos ortogonales**: `status` (disponibilidad, el actual) +
  `housekeepingStatus` nuevo (`dirty | cleaning | clean | inspected`, con
  `blocked` ya cubierto por `maintenance`/`outOfService` del campo
  existente).

**Recomendación:** **C**. Es la única opción que no le quita información a
ningún lado. Implica un ticket propio para agregar `housekeeping_status` a
`RoomDTO`/`Room` (con su mapper y su entrada en `statuses.ts`) — no se
implementa en este PR porque cambia el contrato de `room` más allá de lo
que pedía la FASE 2, y su diseño (¿quién transiciona `inspected`, con qué
permiso?) necesita la sesión de equipo.

### 6.5 Referencia rota: `amenity_ids` de `lot-b.ts`

**Problema** (hallazgo de la FASE 1, no un hueco de la consigna): los
`roomTypes` de `lot-b.ts` referencian `AM-01`…`AM-06`, pero ningún dataset
define amenidades con esos IDs (`mockData.ts` solo tiene `amenity-1`/`-2`).
No falla en runtime porque ningún servicio sirve amenidades desde
`lot-b.ts` todavía, pero es una fuga de datos esperando a un ticket que
conecte `catalogService` al dataset del Lote B.

**Opciones:**

- **A. Agregar un array `amenities` a `lot-b.ts`** con los seis IDs
  `AM-01`…`AM-06` que ya se referencian — es lo que el Lote B claramente
  intentó hacer.
- **B. Migrar las referencias de `lot-b.ts`** para usar `amenity-1`/`-2`
  de `mockData.ts`, consolidando en una sola fuente de amenidades.

**Recomendación:** **A** — más fiel a la intención original del Lote B (seis
amenidades, no dos) y no reduce el catálogo de amenidades ya modelado en
los `roomTypes`. Bloqueado por la decisión 6.2 (categorías), porque las seis
amenidades nuevas deberían nacer ya con la categoría/mapeo que el equipo
decida ahí.

## 7. Cómo se cambia este contrato

1. **Proponer el cambio** en un issue que describa el campo/entidad/estado
   nuevo y quién lo necesita (web, móvil, o ambos).
2. **Anunciarlo a ambos equipos** antes de tocar código — este documento
   existe para que móvil no tenga que leer el código web, así que un
   cambio sin anuncio rompe esa promesa aunque el código compile.
3. **Un solo PR en la web** que actualice, juntos: el DTO, el Model, el
   mapper, `shared/constants/statuses.ts` si agrega un estado, el dataset
   mock si aplica, la prueba de contrato correspondiente
   (`scripts/test-shared-contract.mjs` o la que corresponda), y este
   documento (la tabla de la entidad y, si aplica, la sección 4 o 5).
4. **Nunca quitar o renombrar un campo/literal existente** sin periodo de
   aviso — móvil puede estar en producción leyendo la forma anterior.
   Agregar es seguro; quitar/renombrar requiere coordinar una fecha de
   corte con el equipo de móvil.
5. **Actualizar la fecha de "Última actualización"** al inicio de este
   documento en el mismo commit que documenta el cambio.
