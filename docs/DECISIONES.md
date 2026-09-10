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

## Cómo agregar una nueva decisión

Copiar la estructura de D-001: **Contexto** (qué problema había y qué
evidencia lo sustenta), **Decisión** (qué se hizo), **Qué NO hacer**
(errores concretos que no se deben repetir) y **Alternativas consideradas**
(qué se descartó y por qué). Enlazar desde `docs/CONTRATO-DATOS.md` cuando
la decisión afecte una entidad del contrato.
