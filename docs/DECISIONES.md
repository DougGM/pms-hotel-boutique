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
`OTH-0001`…`OTH-0002` (otro) para `product`; `INV-0001`…`INV-0014` para
`inventory_item` (catálogo de SKU aparte, no comparte numeración con
producto — el PR #36 que agregó el vínculo de consumo con inventario
extendió esta misma numeración provisional hasta `INV-0014`, sin cambiar
el esquema). Marcado como provisional en el comentario de
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

## D-005 · Catálogo de categorías: producto, amenidad e inventario (PARCIALMENTE RESUELTA — ver D-006)

**Fecha:** 2026-09-10 · actualizada 2026-09-10 (PR #36). **Estado:** la
parte `product`/`inventory_item` queda resuelta e implementada (ver
[D-006](#d-006--producto-e-inventario-un-vínculo-con-cantidad-no-una-fk-11));
`amenity` y la agrupación de menú en móvil siguen **pendientes**.

### Contexto

`docs/CONTRATO-DATOS.md` sección 6.2 ya documentaba la falta de mapeo
entre `ProductCategoryDto`/`AmenityCategoryDto` y las secciones de menú
que necesita móvil. Un PR posterior (#36, "vincular productos con
inventario") agregó una **tercera** taxonomía, `InventoryItemCategoryDto`
(`room_service | housekeeping | maintenance | office`), para
`inventory_item` — necesaria para agrupar el inventario, pero que
tampoco se reconciliaba con las otras dos.

### Decisión

Al construir el vínculo de consumo entre `product` e `inventory_item`
(D-006) quedó claro que sus dos taxonomías **debían** unificarse — un
artículo vinculado a un producto necesita poder compartir su categoría
(ver D-006). Se unificaron en una sola fuente
(`shared/constants/catalog-categories.ts`), conservando los valores que
ya usaban ambos datasets, sin renombrar ninguno. **`amenity` no participa
de esta unificación** — sigue con su propia taxonomía (`room | hotel |
service`), a propósito: son servicios del hotel, no artículos. La
pregunta original de si esta taxonomía compartida alcanza para agrupar
visualmente el menú de Room Service en móvil (o si hace falta un
`menu_section` independiente, opción C del documento de contrato) **sigue
sin decidirse** — no se resolvió en este PR.

### Consecuencias

- Un producto de Room Service que también es un artículo de inventario
  (`INV-001`…`INV-005`) ahora tiene **la misma categoría** en ambos lados
  (p. ej. "Agua mineral" es `minibar` en `product` y en `inventory_item`)
  — ya no hay dos categorías independientes que puedan contradecirse.
- `amenity.category` sigue siendo una taxonomía aparte — una pantalla que
  muestre producto/inventario/amenidad juntos sigue necesitando tratar
  `amenity.category` distinto de las otras dos.
- Si el equipo más adelante decide que la taxonomía compartida no alcanza
  para la UX del menú móvil, la opción `menu_section` independiente
  (sección 6.2 de `docs/CONTRATO-DATOS.md`) sigue disponible sin conflicto
  con esta unificación — son capas distintas (clasificación interna vs.
  agrupación visual).

### Qué NO hacer

- **No agregar una cuarta taxonomía** para resolver un caso puntual sin
  antes revisar si encaja en la ya unificada de `product`/`inventory_item`.
- **No asumir que `amenity.category` se corresponde con la de
  `product`/`inventory_item`** — siguen siendo taxonomías distintas a
  propósito.
- **No decidir la agrupación de menú de móvil sin el equipo** solo porque
  la taxonomía interna ya está unificada — son preguntas distintas.

### Alternativas consideradas

Ver D-006 para las alternativas consideradas en la unificación
`product`/`inventory_item` en sí.

## D-006 · Producto e inventario: un vínculo con cantidad, no una FK 1:1

**Fecha:** 2026-09-10 · **Estado:** aceptada e implementada (PR #36).

### Contexto

WEB-12 dejó `product` (lo que el huésped pide) e `inventory_item` (lo que
el hotel almacena) como catálogos prácticamente sin relación:
`inventory_item.product_id?` era una FK opcional 1 a 1. Insuficiente en
la práctica: no carga cantidad (no distingue "1 botella" de "20 g de café
por taza") y solo permite un artículo por producto — un sándwich que
consume pan, jamón y queso, o un café que se vende "por taza" pero se
almacena en kg, no se pueden modelar así. Consecuencia concreta: al
entregar un pedido de Room Service, el inventario no sabía qué descontar.

### Decisión

Siguen siendo **dos entidades separadas** — no se fusionan, porque no
siempre hay correspondencia 1 a 1 (un insumo simple sí, una receta con
varios ingredientes no). Se agrega `product.inventory_consumption: {
inventory_item_id, quantity }[]` — una colección dentro de `product`, no
una entidad propia, porque es configuración que pertenece al producto (qué
consume), no un evento con identidad temporal propia como `charge`; el
precedente ya existente en el contrato es `role.permission_ids: string[]`,
aquí extendido con cantidad. Un producto puede consumir cero, uno o varios
artículos; `quantity` está expresada en la unidad del `inventory_item`, no
en una unidad propia del producto. `inventory_item.product_id?` se
retira. `calculateInventoryConsumption(product, requestedQuantity)`
(`shared/utils/inventoryConsumption.ts`) es la única función que resuelve
el descuento — determinista, sin acceso a datos, mismo espíritu que
`isAmenityOpenAt`/`isRoomAssignable`.

### Consecuencias

- Ganado: un producto preparado (sándwich, café) puede modelar su receta
  completa; el caso simple (1 botella = 1 artículo) sigue siendo trivial
  (`quantity: 1`).
- `product.category` e `inventory_item.category` quedaron unificadas como
  efecto colateral necesario (ver D-005 actualizada): un artículo vinculado
  a un producto ahora comparte su categoría.
- **No se aplica el descuento automático al entregar un pedido** — el
  cálculo existe y está probado, pero engancharlo al flujo real de
  `order`/`service_request` es una decisión de negocio del Lote D que
  todavía no se tomó (¿se descuenta al crear el pedido o al entregarlo?
  ¿qué pasa si no hay suficiente stock? ¿quién lo autoriza?).

### Qué NO hacer

- **No fusionar `product` e `inventory_item` en una sola entidad** — el
  caso de varios insumos por producto (o ningún insumo) rompe la
  correspondencia 1 a 1 que una fusión asumiría.
- **No enganchar `calculateInventoryConsumption` al flujo de entrega de un
  pedido sin decisión de negocio del Lote D** — quién autoriza el
  descuento, qué pasa sin stock suficiente, y si se descuenta al crear o
  al entregar el pedido, siguen sin decidirse.
- **No reimplementar el cálculo de descuento en una pantalla** — usar
  siempre `calculateInventoryConsumption`; `scripts/test-lot-c-d.mjs` lo
  verifica estáticamente.
- **No duplicar la taxonomía de categoría** entre `product` e
  `inventory_item` — comparten una sola fuente
  (`shared/constants/catalog-categories.ts`), ver D-005.

### Alternativas consideradas

1. **Mantener `inventory_item.product_id?` (FK 1 a 1)** — descartada: es
   exactamente la limitación que motivó este trabajo, no soporta varios
   insumos por producto.
2. **Entidad propia `product_inventory_consumption`** (con su propio `id`,
   `created_at`, etc.) — descartada: es configuración estática del
   producto, no un evento con historia propia; una entidad completa para
   esto sería sobreingeniería, igual que ya se evitó con `role.permission_ids`.
3. **Aplicar el descuento automáticamente en este mismo PR** — descartada
   por instrucción explícita: es una decisión de negocio del Lote D
   (cuándo descontar, qué hacer sin stock) que no corresponde tomar al
   construir el dataset mock.

## Cómo agregar una nueva decisión

Copiar la estructura de D-001: **Contexto** (qué problema había y qué
evidencia lo sustenta), **Decisión** (qué se hizo), **Qué NO hacer**
(errores concretos que no se deben repetir) y **Alternativas consideradas**
(qué se descartó y por qué). Enlazar desde `docs/CONTRATO-DATOS.md` cuando
la decisión afecte una entidad del contrato.
