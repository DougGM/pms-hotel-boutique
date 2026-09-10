# Progreso — Datos mock de los lotes C y D (WEB-11, WEB-12)

**Rama:** `feat/mocks-lotes-c-d`
**Base:** `origin/develop` @ `6aba3b3` (Merge pull request #35, incluye #32/#33/#34)
**Iniciado:** 2026-09-10

## FASE 1 — Inventario (solo lectura)

### 1.0 Punto de partida

PR #35 confirmado **MERGED**. Rama creada desde `origin/develop`.

### 1.1 Entidades que ya existen

`src/shared/types/entities/`: `amenity`, `booking`, `charge`, `guest`, `order`,
`payment`, `product`, `promotion`, `rate`, `room`, `room-feature`, `room-type`,
`service-request`, `session`, `user` (14 en el barrel + `session` aparte).

**`charge` y `payment` ya existen en el contrato pero sin dataset real ni
servicio propio** (documentado en `docs/CONTRATO-DATOS.md` sección 3.10):

- `charge`: `id, booking_id, product_id?, description, quantity,
unit_price_cents, amount_cents, currency, status(pending|posted|voided),
charged_at, created_by_user_id?, created_at`. Sin campo para el motivo de
  una anulación.
- `payment`: `id, booking_id, amount_cents, currency, method, status,
transaction_reference?, paid_at?, processed_by_user_id?, created_at`. Ya
  tiene un servicio (`paymentService.ts`), pero lee de `services/mockData.ts`
  (el mundo pequeño: `booking-1`), no del dataset del Lote B
  (`shared/mocks/lot-b.ts`, `BKG-001`…`020`) que este trabajo necesita.

### 1.2 Entidades que faltan — confirmado, son exactamente las previstas

| Entidad a crear      | Para qué                                                               | Carpeta               |
| -------------------- | ---------------------------------------------------------------------- | --------------------- |
| `guest_account`      | Folio/cuenta por estadía — saldo, agrega cargos y pagos de una reserva | `guest-account/`      |
| `deposit`            | Depósito/garantía entregado al check-in                                | `deposit/`            |
| `cash_session`       | Jornada de caja (apertura/cierre)                                      | `cash-session/`       |
| `cash_movement`      | Ingreso/egreso dentro de una jornada                                   | `cash-movement/`      |
| `role`               | Catálogo de roles con su conjunto de permisos                          | `role/`               |
| `permission`         | Catálogo de permisos referenciados por `role`                          | `permission/`         |
| `inventory_item`     | Artículo de inventario (unidad de medida, cantidad mínima)             | `inventory-item/`     |
| `inventory_movement` | Entrada/salida de un artículo                                          | `inventory-movement/` |
| `audit_log`          | Registro de auditoría (quién, cuándo, módulo, acción, entidad)         | `audit-log/`          |

**9 entidades nuevas**, tal como anticipaba el encargo. Ninguna sorpresa.

### 1.3 Modificaciones aditivas a entidades existentes (ninguna quita ni renombra nada)

- **`user`**: `UserRoleDto`/`UserRole` no cubre "room service" ni "conserjería" —
  los dos roles de personal que WEB-12 pide poblar. Se agregan
  `'room_service' | 'concierge'` a la unión existente
  (`'admin' | 'manager' | 'front_desk' | 'housekeeping' | 'maintenance'`),
  sin quitar los que ya había.
- **`amenity`**: no tiene horario de funcionamiento — confirmado en
  `docs/CONTRATO-DATOS.md` sección 3.6 ("limitación conocida"). Se agregan
  `opens_at?`/`closes_at?` (string `HH:mm`), opcionales — una amenidad sin
  horario (24 h, como Wi-Fi) simplemente no los lleva.
- **`charge`**: sin campo para el motivo de una anulación. Se agrega
  `void_reason?: string`, opcional.

Las tres son estrictamente aditivas (campos opcionales o una unión de
literales ampliada) — no rompen ningún consumidor existente ni el contrato
publicado.

### 1.4 Datos ya existentes a los que hay que apuntar

`src/shared/mocks/lot-b.ts` (el dataset "real" que sirven
`bookingService`/`roomService`/`guestService`, distinto del mundo pequeño de
`services/mockData.ts`):

- **20 reservas** `BKG-001`…`BKG-020`, con las 6 combinaciones de estado:
  `pending`(4), `confirmed`(7), `checked_in`(1), `checked_out`(4),
  `cancelled`(2), `no_show`(2).
- **12 huéspedes** `GST-001`…`GST-012`.
- **15 habitaciones** `RM-101`…`RM-503`, 5 tipos `RT-01`…`RT-05`.
- **10 tarifas** `RATE-01`…`RATE-10`, 3 promociones `PROMO-01`…`03`.

`services/mockData.ts` (el mundo pequeño, sin tocar): `booking-1`, `guest-1`,
`room-101`/`202`, `product-1`/`2`, `amenity-1`/`2`, `payment-1`.

**Decisión de diseño (no es una decisión de equipo, es una elección de
implementación):** las cuentas/cargos/pagos/depósitos del Lote C se
construyen sobre las reservas y huéspedes del **Lote B** (`BKG-*`/`GST-*`),
no sobre el mundo pequeño de `mockData.ts` — es el dataset real que ya sirven
los servicios de recepción, y es donde hay variedad de estados para cubrir
los casos pedidos (saldo pendiente, cero, sobrepago, cuenta cerrada). Se
crean `shared/mocks/lot-c.ts` y `shared/mocks/lot-d.ts` — mismo patrón que
`lot-b.ts` — en vez de mezclar todo en un solo archivo o en `mockData.ts`.

**Consecuencia:** `catalogService.getProducts`/`getAmenities` se redirige de
`services/mockData.ts` (2 productos, 2 amenidades) a `shared/mocks/lot-d.ts`
(25 productos, amenidades con horario). Los arrays viejos de `mockData.ts`
quedan sin consumidor de servicio — igual que ya pasaba con
`lot-b.ts`/`mockData.ts` para habitaciones/huéspedes/reservas (deuda ya
documentada). Sus pruebas propias (`test-money-contract.mjs`,
`test-shared-contract.mjs`, `test-referential-integrity.mjs`) los siguen
validando directamente, así que no quedan huérfanos de verificación, solo de
consumo en la app — se señala aquí para que no sea una sorpresa.

### 1.5 Patrón de servicios a replicar

Confirmado en `roomService.ts`/`guestService.ts`/`catalogService.ts`: objeto
con métodos `async`, `await simulateLatency()`, `mockUtils.throwIfSimulatingError(...)`,
devuelve `Model[]` vía el mapper de la entidad, lee de un dataset importado
(`lotBMockData` o `mockData.ts`), `export default` al final.

Servicios nuevos a crear, agrupados por tema (como ya hace `catalogService`
con `product`+`amenity`):

- `guestAccountService.ts` — `guest_account`, `charge`, `payment`, `deposit`
  (Lote C, cuenta del huésped).
- `cashService.ts` — `cash_session`, `cash_movement` (Lote C, caja).
- `personnelService.ts` — `user`, `role`, `permission` (Lote D).
- `inventoryService.ts` — `inventory_item`, `inventory_movement` (Lote D).
- `auditService.ts` — `audit_log` (Lote D).
- `catalogService.ts` (existente) — se redirige a `lot-d.ts` para
  `product`/`amenity` (ver 1.4).

### 1.6 `role` ↔ `user.role`: cómo se relacionan sin romper el contrato

`user.role` sigue siendo el literal de puesto (contrato ya publicado, no se
toca su tipo). El catálogo `role` es nuevo y **no es una FK desde `user`** —
sería un cambio de tipo disruptivo sin aviso. En su lugar, `role.code` usa
exactamente los mismos literales que `UserRoleDto` (incluidos los dos
nuevos). La prueba de integridad referencial de la FASE 5 verifica esa
correspondencia por valor: todo `user.role` tiene un `role.code` igual en el
catálogo — sin necesidad de una FK real ni de tocar el tipo de `user`.

**No se encontró ninguna entidad adicional inesperada ni ninguna divergencia
más allá de lo ya previsto.** Se procede a la FASE 2.

## FASE 2 — WEB-11 · Lote C: cuentas, pagos y caja

Commit `7945cd0`.

- Entidades nuevas: `guest-account`, `deposit`, `cash-session`,
  `cash-movement`. `charge` gana `void_reason?` (aditivo).
- `statuses.ts`: `GUEST_ACCOUNT_STATUSES`, `DEPOSIT_STATUSES`,
  `CASH_SESSION_STATUSES` con transiciones.
- `shared/mocks/lot-c.ts`, construido sobre `BKG-*`/`GST-*` del Lote B:

| Cuenta   | Reserva | Cargos (no anulados) | Pagos  | Saldo      | Caso                                |
| -------- | ------- | -------------------- | ------ | ---------- | ----------------------------------- |
| GACC-001 | BKG-003 | 305500               | 200000 | **105500** | Saldo pendiente                     |
| GACC-002 | BKG-009 | 300000               | 300000 | **0**      | Saldo saldado en cero               |
| GACC-003 | BKG-002 | 255000               | 280000 | **-25000** | Sobrepago                           |
| GACC-004 | BKG-004 | 452000               | 452000 | **0**      | Cerrada, con comprobante `RCB-0004` |

| Jornada | Apertura | Ingresos | Egresos | Esperado              | Contado | Diferencia |
| ------- | -------- | -------- | ------- | --------------------- | ------- | ---------- |
| CS-001  | 500000   | 200000   | 15000   | 685000                | 685000  | **0**      |
| CS-002  | 685000   | 580000   | 8000    | 1257000               | 1253000 | **-4000**  |
| CS-003  | 1253000  | —        | —       | (abierta, sin cerrar) | —       | —          |

Aritmética verificada con un script de una línea antes de comitear (ver
comando en el historial de esta sesión) — todos los valores anteriores
coinciden exactamente con lo escrito en `lot-c.ts`.

- Servicios nuevos: `guestAccountService.ts`, `cashService.ts` — ningún
  dataset queda huérfano.
- **Referencia pendiente hasta la FASE 3:** `USR-001`/`USR-002` (usados en
  `created_by_user_id`, `processed_by_user_id`, `opened_by_user_id`,
  `closed_by_user_id`, `responsible_user_id`) se crean en el catálogo de
  personal del Lote D. No resuelven hasta que ese commit aterrice — dentro
  del mismo PR quedan consistentes antes de abrir el PR.

`npm run typecheck`/`lint`/`build` verdes; `npm run test:contract` 24/24
(incluye las 4 entidades nuevas). No se corre `npm run check` completo
todavía — las referencias a `USR-*` harían fallar la integridad
referencial hasta que la FASE 3 las complete.
