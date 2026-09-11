# Decisiones de arquitectura y modelado

Registro de decisiones de diseño del contrato de datos que no son evidentes
leyendo el código: por qué se modeló algo de una forma y no de otra. No
sustituye a `docs/CONTRATO-DATOS.md` (el contrato en sí) ni a
`PROGRESO-CONTRATO.md`/`PROGRESO-FASE-0.md` (bitácoras de trabajo) — este
documento es la memoria a largo plazo de las decisiones, para que no se
vuelvan a discutir ni se deshagan por accidente.

## D-001 · `room_feature` es una entidad distinta de `amenity`

**Fecha:** 2026-09-10
**Estado:** Resuelta e implementada.

### Contexto

`room-type.amenity_ids` (antes `room-type.amenity_ids`) referenciaba IDs
(`AM-01`…`AM-06`) que no existían en ningún catálogo de amenidades del
dataset del Lote B (`shared/mocks/lot-b.ts`) — una referencia rota
detectada durante el trabajo de `docs/CONTRATO-DATOS.md`. Al investigar el
porqué, se encontraron dos conceptos de dominio distintos apuntando a la
misma entidad:

- **Características de habitación**: aire acondicionado, balcón, vista al
  jardín, jacuzzi. Son parte de lo que el cliente compra al elegir un tipo
  de habitación; no tienen horario ni se "activan/desactivan" — o la
  habitación las tiene, o no.
- **Amenidades de hotel**: Wi-Fi, desayuno, piscina, spa. Son servicios
  compartidos del hotel completo, con horario de funcionamiento, que el
  administrador activa o desactiva, y que el huésped consulta desde la app
  móvil independientemente de en qué habitación esté.

Evidencia de que estaban mezclados, no solo mal poblados:

1. El patrón de `room-type.amenity_ids` en `lot-b.ts` era acumulativo por
   categoría de habitación (Estándar = 3 IDs, Suite Presidencial = 6 IDs) —
   el comportamiento de una característica que se agrega en las categorías
   más altas, no el de un servicio compartido del hotel (una piscina no
   "crece" según el tipo de habitación).
2. En `services/mockData.ts`, las mismas referencias sí resolvían (apuntaban
   a `amenity-1`/`amenity-2`, que existen), pero colgaban amenidades
   genuinamente de hotel (Wi-Fi, Desayuno) de un tipo de habitación
   específico — sin sentido de dominio aunque no rompiera nada
   técnicamente.
3. `AmenityCategoryDto` ya incluía un literal `'room'` sin ningún dato real
   que lo usara — vestigio de intentar que una sola entidad cubriera ambos
   casos.

### Decisión

Separar en dos entidades:

- **`room_feature`** (`shared/types/entities/room-feature/`): catálogo
  propio, sin horario, sin `active`/`inactive`. `id, name, description?,
  created_at, updated_at`. `room-type` la referencia por
  `room_feature_ids`/`roomFeatureIds`.
- **`amenity`** (sin cambios en su contrato): se mantiene con `category`,
  `location?`, `active`, pensada para horario/estado en el futuro si el
  equipo lo decide. **Deja de ser referenciada desde `room-type`** —
  pertenece al hotel, no a la habitación.

`room_type_id` en booking/rate no cambia; el único campo renombrado es
`room-type.amenity_ids` → `room-type.room_feature_ids`.

### Qué NO hacer

- **No volver a colgar una amenidad de hotel (piscina, spa, Wi-Fi general,
  desayuno) desde `room` ni desde `room-type`.** Una amenidad de hotel no
  varía por habitación; si una pantalla necesita mostrar "qué amenidades
  tiene el hotel", debe leer del catálogo de `amenity` directamente, nunca
  a través de un tipo de habitación.
- **No agregar de nuevo un campo `amenity_ids` a `room` o `room-type`.** Si
  aparece la necesidad de decir "esta habitación tiene acceso a tal
  amenidad" (p. ej. una suite con acceso privado a un spa), es un caso
  nuevo que merece su propio campo con nombre explícito
  (`private_amenity_ids` o similar) y su propia discusión de equipo — no
  reutilizar `amenity_ids` para eso.
- **No fusionar `room_feature` y `amenity` en una sola entidad** para
  "ahorrar una tabla". Son dos ciclos de vida distintos (una característica
  no se activa/desactiva ni tiene horario; una amenidad sí) y fusionarlos
  reintroduce exactamente la confusión que esta decisión resuelve.

### Alternativas consideradas

1. **Agregar las amenidades faltantes al catálogo** (`AM-01`…`AM-06` con
   datos reales) sin crear una entidad nueva — descartada porque no
   resolvía el sinsentido de fondo: seguiría habiendo amenidades de hotel
   (o lo que fueran esos seis registros) colgando de un tipo de habitación,
   y `mockData.ts` ya demostraba que aun cuando la referencia resuelve, el
   modelo no tiene sentido.
2. **Mover `amenity_ids` de `room-type` a `room`** (tal como sugería
   literalmente el enunciado del hallazgo) — descartada: `capacity`,
   `bed_configuration` y `description` ya viven en `room-type`, no en
   `room`, en este contrato (ver `docs/CONTRATO-DATOS.md` sección 3.1);
   mover solo las características a `room` habría creado una inconsistencia
   nueva entre dónde vive cada atributo de una habitación.

## D-002 · El estado de habitación son dos campos, no uno

**Fecha:** 2026-09-10 · **Estado:** aceptada e implementada.

> Nota: la plantilla que originó esta entrada la pedía como "D-001", pero
> ese número ya lo ocupa la decisión de `room_feature` vs. `amenity` (más
> arriba en este documento, del trabajo anterior). Se registra como
> **D-002** para no pisar la entrada existente.

### Contexto

La web modelaba el estado de la habitación como **disponibilidad**: libre,
ocupada, bloqueada por mantenimiento o fuera de servicio (`RoomStatus`,
único campo `status`). La app móvil necesita el **flujo operativo de
limpieza**: `dirty → cleaning → clean → inspected`, que el personal de
limpieza reporta desde su turno.

No son la misma cosa ni son alternativas entre sí: una habitación puede
estar ocupada y sucia a la vez, o libre y todavía sin limpiar — y ese
último caso es precisamente el que recepción no debe poder vender. Antes
de esta decisión, el campo único ya incluía un valor `cleaning` que
intentaba cubrir parte del flujo de limpieza dentro del campo de
disponibilidad — la mezcla que esta decisión separa. Documentado como
decisión pendiente en `docs/CONTRATO-DATOS.md` sección 6.4 desde el
trabajo del contrato compartido (PR #33); nunca se implementó hasta ahora.

### Decisión

Dos campos independientes en la entidad `room`:

- **`status`/`RoomStatus`** — ocupación. La controla la web (recepción:
  check-in, check-out, bloqueo por mantenimiento). Literales:
  `available | occupied | maintenance | outOfService` (los mismos 4 que ya
  existían; se retiró `cleaning`, que pasa por completo a la otra máquina).
- **`housekeeping_status`/`RoomHousekeepingStatus`** (nuevo) — limpieza. La
  controla la app móvil (personal de limpieza), y la web solo la lee.
  Literales: `dirty | cleaning | clean | inspected`.
- **Regla de asignabilidad derivada** — `isRoomAssignable()` en
  `shared/constants/statuses.ts`: una habitación es asignable solo si
  `status === 'available'` **y** `housekeepingStatus` es `'clean'` o
  `'inspected'`. Vive junto a las dos máquinas, no en cada pantalla; el
  Model expone el resultado ya calculado como `isAssignable` (no existe en
  el DTO).

### Consecuencias

- **Gana** el proyecto: recepción puede distinguir "libre pero sucia" (no
  vendible) de "libre y lista" (vendible) — el caso que el campo único no
  podía expresar. Móvil gana su propio flujo de limpieza sin pisar la
  semántica de ocupación de la web, y sin que la web tenga que interpretar
  literales que no le pertenecen.
- **Cuesta**: un campo más en el contrato de `room` (`housekeeping_status`)
  que todo consumidor futuro debe poblar; los datasets mock necesitan
  cubrir combinaciones realistas de ambos campos, no solo un estado.
- **A quién afecta**: al Lote B (recepción/Gantt de habitaciones — cuando
  se construya la pantalla de calendario, debe leer `isAssignable`, no
  reimplementar la regla) y a la experiencia de limpieza de la app móvil
  (MOV-04), que es quien escribe `housekeeping_status`.

### Qué NO hacer

- **Fusionar ambos campos en uno.** Es exactamente el error que esta
  decisión corrige — vuelve a obligar a inventar estados combinados
  (`"ocupada-y-sucia"`, `"libre-y-inspeccionada"`...) en vez de dos
  campos ortogonales.
- **Reimplementar la regla de asignabilidad fuera de `statuses.ts`.**
  `scripts/test-room-status.mjs` tiene una prueba estática que falla si
  algún archivo fuera de `shared/constants/statuses.ts` compara
  `status === 'available'` junto con `housekeepingStatus`.
- **Permitir que móvil escriba el estado de ocupación.** Check-in,
  check-out y bloqueo por mantenimiento son operación de recepción, en la
  web. Móvil solo lee `status`.

## D-003 · El catálogo `role`/`permission` no es una FK desde `user.role`

**Fecha:** 2026-09-10 · **Estado:** aceptada e implementada.

### Contexto

WEB-12 (Lote D) pide "roles con su conjunto de permisos, de forma que se
pueda probar que un rol ve unas opciones y otro no". `user.role` ya existe
como literal de puesto (`UserRoleDto`, contrato publicado desde el trabajo
del contrato compartido) y no se puede cambiar de tipo sin aviso — ver
sección 7 de `docs/CONTRATO-DATOS.md`. Se necesitaba un catálogo nuevo
(`role` con su lista de `permission`) sin romper eso.

### Decisión

`role.code` usa exactamente los mismos literales que `UserRoleDto`
(incluidos los dos nuevos de este PR: `room_service`, `concierge`), pero
**no es una FK real** desde `user.role` — es una correspondencia por
valor. `user.role` sigue siendo el literal que ya era; `role` es un
catálogo aparte que describe qué puede hacer cada puesto.
`scripts/test-referential-integrity.mjs` verifica la correspondencia
(todo `user.role` tiene un `role.code` igual) sin necesitar un `role_id`
en `user`.

### Consecuencias

- **Gana** el proyecto: WEB-12 puede modelar permisos por rol sin abrir
  una migración de tipo sobre `user`, que ya estaba en uso por WEB-06
  (guardas de ruta) y por el contrato compartido con móvil.
- **Cuesta**: la correspondencia es por valor, no por FK — si `role.code`
  y `UserRoleDto` alguna vez divergen (alguien agrega un rol nuevo en uno
  y no en el otro), no hay una restricción de base de datos que lo impida,
  solo la prueba de integridad referencial.
- **A quién afecta**: a quien construya la pantalla de "roles y permisos"
  del Lote D — debe leer `role.permission_ids` para decidir qué mostrar,
  nunca inferir permisos a partir del literal `user.role` directamente.

### Qué NO hacer

- **No agregar un `role_id` a `user`** para forzar una FK real. Es un
  cambio de tipo sobre una entidad ya publicada — necesita coordinarse
  con el equipo y con móvil antes, no decidirse dentro de un PR de datos
  mock.
- **No usar la sesión de acceso al PMS (`UserRole` de `common.ts`:
  `ADMIN`/`RECEPTIONIST`/`MANAGER`/`STAFF`) como si fuera lo mismo que
  `role`.** Son tres conceptos ya deliberadamente separados: sesión de
  acceso, puesto de personal (`user.role`) y este catálogo de
  configuración (`role`/`permission`). Ver también la separación
  `session`/`user` en `docs/CONTRATO-DATOS.md` sección 3.12.

### Alternativas consideradas

1. **FK real (`user.role_id` → `role.id`)** — descartada por lo ya dicho:
   cambiaría el tipo de un campo publicado sin el aviso que exige la
   sección 7 del contrato.
2. **No crear `role`/`permission` y resolver permisos con un `switch`
   sobre `user.role` en cada pantalla** — descartada: es exactamente el
   antipatrón que WEB-12 pide evitar ("se pueda probar que un rol ve unas
   opciones y otro no" implica un catálogo consultable, no lógica
   dispersa).

## D-004 · Formato de SKU de inventario (PENDIENTE — decisión de equipo)

**Fecha:** 2026-09-10 · **Estado:** pendiente — valor provisional en uso.

### Contexto

El Lote C/D necesitaba poblar `product.sku` (25 productos) e
`inventory_item.sku` (10 artículos, catálogo separado del de producto) sin
frenar el resto del trabajo. `docs/CONTRATO-DATOS.md` sección 6.1 ya
documentaba esta decisión como pendiente desde el contrato compartido,
con tres opciones y una recomendación — este PR **no la decide**, solo
aplica esa recomendación de forma provisional para tener datos con los que
trabajar.

### Decisión (provisional, no definitiva)

Prefijo por categoría + secuencia: `MIN-0001`…`MIN-0008` (minibar),
`FYB-0001`…`FYB-0010` (comida y bebida), `SHP-0001`…`SHP-0005` (tienda),
`OTH-0001`…`OTH-0002` (otro) para `product`; `INV-0001`…`INV-0010` para
`inventory_item` (catálogo de SKU aparte, no comparte numeración con
producto). Marcado como provisional en el comentario de
`shared/mocks/lot-d.ts`.

### Consecuencias

- Si el equipo elige otra opción (texto libre, o código opaco con
  `display_name` aparte — sección 6.1), **hay que migrar los 35 SKU de
  este dataset**, no son estables todavía.
- Ningún test de contrato valida el formato del SKU con una expresión
  regular — a propósito, para no congelar una decisión que no se ha
  tomado.

### Qué NO hacer

- **No asumir que `MIN-0001`/`INV-0001` son el formato final.** Cualquier
  pantalla o servicio que valide el formato de un SKU con una expresión
  regular estaría congelando una decisión pendiente.
- **No decidir esto sin la sesión de equipo** solo porque ya hay datos
  con este formato — los datos son de prueba, la decisión sigue abierta.

## D-005 · Catálogo de categorías: producto, amenidad e inventario (PENDIENTE — decisión de equipo)

**Fecha:** 2026-09-10 · **Estado:** pendiente.

### Contexto

`docs/CONTRATO-DATOS.md` sección 6.2 ya documentaba la falta de mapeo
entre `ProductCategoryDto`/`AmenityCategoryDto` y las secciones de menú
que necesita móvil. Este PR agregó una **tercera** taxonomía,
`InventoryItemCategoryDto` (`room_service | housekeeping | maintenance |
office`), para `inventory_item` — necesaria para agrupar el inventario,
pero que tampoco se reconcilia con las otras dos.

### Decisión (provisional, no definitiva)

Se mantienen las tres taxonomías **independientes** por ahora: cada una
resuelve el problema inmediato de su propia entidad (facturación para
`product`, agrupación de horarios para `amenity`, tipo de insumo para
`inventory_item`), sin intentar unificarlas.

### Consecuencias

- Un producto de Room Service que también es un artículo de inventario
  (la mayoría de `INV-001`…`INV-005`) tiene **dos categorías
  independientes** (`product.category` y `inventory_item.category`) que
  pueden decir cosas distintas del mismo objeto — es correcto mientras no
  se decida una taxonomía única, pero hay que explicarlo así en cualquier
  pantalla que muestre ambas.

### Qué NO hacer

- **No agregar una cuarta taxonomía** para resolver un caso puntual sin
  antes revisar las tres existentes en la misma sesión de equipo.
- **No asumir que `InventoryItemCategoryDto` y `ProductCategoryDto` se
  corresponden 1 a 1** (p. ej. `room_service` de inventario no es lo mismo
  que ningún valor de `ProductCategoryDto`) — son taxonomías distintas
  hasta que el equipo decida lo contrario.

## D-006 · Ronda 1: `routes.ts`/`router.tsx` y `Permission` (WEB-06) se congelan

**Fecha:** 2026-09-11 · **Estado:** aceptada e implementada.

### Contexto

La Ronda 1 arranca con cuatro lotes en paralelo (`rooms`, `booking-engine`,
`occupancy`, `front-desk`) que necesitan registrar rutas el mismo día. Si
cada lote edita `src/app/routes.ts`/`src/app/router.tsx` en su propia
rama, los cuatro colisionan de inmediato en esos dos archivos. Además, la
unión `Permission` de WEB-06 (`src/modules/auth/models/session.ts`) solo
cubría siete valores (`dashboard|reception|housekeeping|room-service|
concierge|cash|users:view`) — ninguno cubre rooms, occupancy o front-desk.

### Decisión

Se registran las 14 rutas de la Ronda 1 de una sola vez (PR #39,
andamiaje) y `routes.ts`/`router.tsx` quedan **congelados**: una ruta
nueva se pide por PR a JEPG321. Se extiende `Permission` con tres valores
— `rooms:manage` (ADMIN, MANAGER), `occupancy:view` y `front-desk:operate`
(ADMIN, MANAGER, RECEPTIONIST) — y ese archivo queda congelado con el
mismo procedimiento, mismo dueño.

### Consecuencias

- **Gana**: los cuatro lotes ramifican el mismo día sin conflicto de
  merge en el ruteo ni en el contrato de permisos de sesión.
- **Cuesta**: coexisten dos vocabularios de permisos sin sincronizar — la
  unión `Permission` de `session.ts` (la que aplica `RequirePermission`,
  WEB-06) y `permissionsDB`/`rolesDB` de `db.ts` (catálogo WEB-12, D-003).
  Ninguno de los tres permisos nuevos tiene equivalente en `permissionsDB`
  (9 registros: `manage_users`, `view_reports`, `manage_bookings`,
  `manage_cash`, `manage_housekeeping_tasks`,
  `manage_room_service_orders`, `manage_concierge_requests`,
  `manage_inventory`, `view_own_tasks`) — no se tocó ese catálogo.
- **A quién afecta**: al Lote D cuando construya la pantalla de "roles y
  permisos" — necesita decidir si unifica los dos vocabularios, los
  mapea explícitamente, o los documenta como capas deliberadamente
  separadas (en la línea de D-003). No resolver esto antes de esa
  pantalla arriesga que la pantalla de roles/permisos mienta sobre lo que
  de verdad controla el acceso.

### Qué NO hacer

- **No agregar rutas ni permisos ad hoc** desde la rama de un lote — se
  piden por PR a JEPG321.
- **No inferir el permiso de una ruta nueva desde `permissionsDB`** — ese
  catálogo no está conectado al guarda de rutas (`RequirePermission` solo
  conoce `Permission` de `session.ts`).

### Alternativas consideradas

1. **Que cada lote registre sus propias rutas en su rama** — descartada:
   conflicto de merge garantizado en `routes.ts`/`router.tsx` el primer
   día.
2. **Reutilizar un permiso existente** (p. ej. `reception:view`) para
   rooms/occupancy/front-desk en vez de crear tres nuevos — descartada:
   mezclaría el control de acceso de configuración de habitaciones
   (ADMIN/MANAGER) con el de recepción (que hoy alcanza a RECEPTIONIST),
   perdiendo la distinción que pedía WEB-06.

Ver también `docs/ronda-1-scaffold.md` para la tabla completa de rutas y
permisos.

## Cómo agregar una nueva decisión

Copiar la estructura de D-001: **Contexto** (qué problema había y qué
evidencia lo sustenta), **Decisión** (qué se hizo), **Qué NO hacer**
(errores concretos que no se deben repetir) y **Alternativas consideradas**
(qué se descartó y por qué). Enlazar desde `docs/CONTRATO-DATOS.md` cuando
la decisión afecte una entidad del contrato.
