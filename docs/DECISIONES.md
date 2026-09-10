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

## Cómo agregar una nueva decisión

Copiar la estructura de D-001: **Contexto** (qué problema había y qué
evidencia lo sustenta), **Decisión** (qué se hizo), **Qué NO hacer**
(errores concretos que no se deben repetir) y **Alternativas consideradas**
(qué se descartó y por qué). Enlazar desde `docs/CONTRATO-DATOS.md` cuando
la decisión afecte una entidad del contrato.
