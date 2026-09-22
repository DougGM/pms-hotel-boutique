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

  Nota 2026-09-22 (#73): mientras la app movil no sea la unica superficie
  operativa disponible, el workspace web de Limpieza tambien puede escribir
  este campo mediante `roomService` para persistir iniciar/finalizar/cambiar
  estado. Recepcion y los demas modulos web lo siguen consumiendo como lectura
  del estado actualizado.
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

## D-007 � Seguimiento de #18/#24: roles finales de login

**Fecha:** 2026-09-12 � **Estado:** aceptada e implementada en la capa de sesion.

### Contexto

Durante la revision posterior a los merges de Ronda 1 se detecto que `#18`
(WEB-06, shell de autenticacion y guardas por rol) y `#24` (WEB-12, datos mock
de roles/permisos) cerraron la base tecnica, pero dejaron una brecha: los roles
de sesion seguian siendo genericos (`ADMIN`, `RECEPTIONIST`, `MANAGER`,
`STAFF`) mientras producto necesitaba roles funcionales para probar accesos por
area.

Eso hacia dificil probar de forma directa los accesos de huesped, recepcion,
limpieza, conserjeria y room service desde el login general.

### Decision

La capa de sesion/login cambia a estos roles funcionales:

- `ADMIN`
- `GUEST`
- `RECEPTION`
- `HOUSEKEEPING`
- `CONCIERGE`
- `ROOM_SERVICE`

Se agregan cuentas mock para cada rol en `sessionAccountsDB` y se actualiza la
matriz de permisos en `modules/auth/models/session.ts`.

El catalogo operativo (`user.role`, `rolesDB`) tambien queda alineado a los
mismos roles en formato de datos:

- `admin`
- `guest`
- `reception`
- `housekeeping`
- `concierge`
- `room_service`

`permissionsDB` conserva sus llaves porque modelan acciones, no nombres de
roles. En el frontend beta, `personnelService.getUsers` toma
`sessionAccountsDB` como fuente visible de gestion de usuarios para que
administracion muestre las mismas cuentas/roles que se usan para iniciar
sesion. `usersDB` queda como directorio operativo historico del Lote D.

### Que NO hacer

- No volver a usar `MANAGER`/`STAFF` como roles de sesion.
- No volver a usar `manager`/`front_desk`/`maintenance` como roles de usuario
  operativo.
- No mezclar `HOUSEKEEPING` con `CONCIERGE`: limpieza y conserjeria son flujos
  distintos.
- No tratar el portal `GUEST` como backend real de produccion: existe como
  portal funcional sobre servicios mock, con reservas/pedidos/solicitudes/
  perfil/notificaciones persistiendo en `src/data/db.ts` durante la sesion.
- No cambiar roles sin actualizar permisos, mocks, navegacion, tests y docs en
  el mismo cambio.

### Seguimiento

Si se agrega un rol nuevo, debe entrar en `common.ts`, `session.ts`,
`UserRoleDto`, `rolesDB`, tests de contrato/integridad y documentacion del
mismo PR.

## D-008 · Limpieza, Room Service y Conserjería se sacan del menú web: viven en pms-hotel-mobile

**Fecha:** 2026-09-15 · **Estado:** reemplazada por D-009.

### Contexto

`privateNavigation` tenía diez entradas, incluidas Limpieza
(`housekeeping:view`), Room Service (`room-service:view`) y Conserjería
(`concierge:view`). Las tres apuntaban al placeholder genérico
`ModuleHomePage`, sin ninguna pantalla real detrás. Probado en el
navegador: un usuario con rol HOUSEKEEPING/CONCIERGE/ROOM_SERVICE entra a
su único módulo visible y encuentra "Las funciones de esta sección
estarán disponibles próximamente" — no porque falte construir la
pantalla en esta Ronda, sino porque, según el plan del proyecto, la
experiencia operativa de limpieza, room service y conserjería vive en
`pms-hotel-mobile`, un repositorio aparte. La web nunca va a tener esas
pantallas.

### Decisión

Se quitan las tres entradas de `privateNavigation`
(`src/private/routes/navigation.ts`). Se dejan intactos:

- Sus rutas: `routePaths.pms.housekeeping`/`roomService`/`concierge` en
  `routes.ts` (congelado por D-006).
- Sus permisos: `housekeeping:view`/`room-service:view`/`concierge:view`
  en la unión `Permission` y en `rolePermissions` de `session.ts`
  (también congelado por D-006).

`router.tsx` deriva el placeholder de cada módulo directamente de
`privateNavigation` (mecanismo introducido al arreglar el bug de rutas
duplicadas de esta misma rama): quitar la entrada del menú también
retira automáticamente su ruta, sin tocar `router.tsx` a mano. Si algún
día se decide que alguno de estos roles necesita respaldo web, reactivar
es agregar de nuevo la entrada a `privateNavigation` — nada más, ni
`routes.ts`, ni `session.ts`, ni `router.tsx` cambian.

Caja (`cash:view`) y Usuarios (`users:view`) **no se tocan**: son
pantallas web propias de la Ronda 1 (lotes C y D) que sus responsables
todavía no construyen. Siguen en el menú mostrando el mismo placeholder.

### Consecuencias

- **Gana**: el menú web deja de anunciar tres módulos que nunca se van a
  construir ahí. ADMIN pasa de 10 a 7 entradas; HOUSEKEEPING, CONCIERGE y
  ROOM_SERVICE ven solo Panel operativo, que es exactamente lo que la web
  les ofrece hoy.
- **Cuesta**: ninguna directa — las historias de usuario de esos tres
  módulos no se resuelven con este cambio, solo se deja de fingir que la
  web las cubre.
- **A quién afecta**: a quien planifique `pms-hotel-mobile`, que hereda
  las 32 historias de usuario de limpieza, room service y conserjería
  completas, sin ningún respaldo web parcial que las reemplace.

### Qué NO hacer

- **No volver a agregar Limpieza, Room Service o Conserjería al menú
  web** sin decidir antes, como equipo, si alguno de esos roles necesita
  respaldo web — son 32 historias de usuario sin dueño hoy, y agregarlas
  de nuevo sin esa decisión repite el problema que motivó este ADR.
- **No aplicar el mismo criterio a Caja o Usuarios** — son pantallas web
  de la Ronda 1, no de mobile; quedan como placeholder hasta que sus
  responsables las construyan.
- **No borrar** `routePaths.pms.housekeeping`/`roomService`/`concierge`
  de `routes.ts` ni los permisos correspondientes de `session.ts` — son
  el contrato válido si se decide respaldo web más adelante, y borrarlos
  obligaría a rehacerlos desde cero.

### Alternativas consideradas

1. **Dejar las tres entradas apuntando al placeholder** — descartada: el
   propietario del repositorio las probó en el navegador y confirmó que
   no llevan a ninguna experiencia real, ni la van a tener en esta web.
2. **Borrar también las rutas y los permisos de `routes.ts`/`session.ts`**
   — descartada: son parte del contrato compartido con mobile y están
   congelados por D-006; borrarlos ahora obligaría a rehacerlos por
   completo si algún día se decide dar respaldo web a alguno de los tres.

## D-009 · Migración privada Bolt como respaldo web completo

**Fecha:** 2026-09-16 · **Estado:** aceptada en rama `feat/migracion-bolt-completa-20260916`.

### Contexto

La app modular conservaba parte del contrato visual Bolt, pero varias
experiencias privadas completas del prototipo habían quedado fuera o reducidas:
Recepción, Administración, Limpieza, Room Service, Conserjería y huésped.
Caja y Usuarios seguían apareciendo como placeholders, y D-008 había retirado
Limpieza/Room Service/Conserjería del menú web.

Producto pidió recuperar el frente Bolt dentro de la arquitectura actual, sin
volver al login del prototipo. También se pidió retirar el rol de Pasarela de
pago, mantener Perfil/Preferencias/Cerrar sesión en el menú superior de usuario
y usar lápiz para editar más switch para activar/desactivar.

### Decisión

Se agrega `src/private/workspace/` y los modulos de dominio (`front-desk`, `administration`, `guest-portal`, `room-service`) como módulo de migración Bolt para las
pantallas privadas. El login, la sesión y los permisos siguen siendo los
actuales (`/auth/login`, `RequireSession`, `useAuth`). El workspace Bolt recibe
el rol desde la sesión o desde la ruta privada dedicada.

`router.tsx` conecta rutas privadas directas para dashboard, recepción,
limpieza, room service, conserjería, caja, usuarios, habitaciones y tipos de
habitación contra `PrivateSessionWorkspace`. Las rutas de formularios/detalles que
todavía dependen del flujo modular existente permanecen disponibles bajo el
`PrivateLayout` previo.

El destino por defecto del login tambien queda alineado a esas rutas: RECEPCION
entra a `/pms/reception`, HOUSEKEEPING a `/pms/housekeeping`, CONCIERGE a
`/pms/concierge` y ROOM_SERVICE a `/pms/room-service` cuando no hay una URL
privada previa segura que restaurar.

El rol de Pasarela de pago se elimina del workspace migrado. Los pagos quedan
como funcionalidad de reservas/caja, no como rol lateral.

Room Service no requiere un cobro manual separado: cuando un pedido pasa a
`Entregado`, el consumo se agrega automaticamente al folio de la reserva activa
de esa habitacion y el pedido queda marcado como cargado. Si el pedido se
cancela o rechaza antes de entregarse, no genera cargo.

### Qué NO hacer

- No restaurar el login de Bolt: el login profesional actual es el contrato.
- No volver a poner Perfil, Preferencias o Cerrar sesión como entradas del menú
  lateral; viven en el menú del usuario del topbar.
- No crear un segundo sistema visual para estas pantallas: los componentes
  migrados siguen usando `visitor-*`, `reservation-*`, `rc-*`, `adm-*`,
  `.panel`, `.button`, `.content` y la hoja `src/index.css`.
- No reintroducir el rol Pasarela de pago como rol de sesión o navegación.

### Alternativas consideradas

1. **Reemplazar toda la app por el `App.tsx` original de Bolt** — descartada:
   habría roto el login, guards, rutas, permisos y carpetas actuales.
2. **Copiar solo estilos Bolt sobre las pantallas existentes** — descartada:
   no recuperaba los flujos completos que sí existían en el prototipo.

## D-010 · Instante vs. fecha de calendario: convención de conversión Date↔string

**Fecha:** 2026-09-17 · **Estado:** aceptada e implementada parcialmente (ver "Qué queda pendiente").

### Contexto

75ccc64 corrigió un bug puntual en `GuestContent.tsx`:
`booking.checkIn.toISOString().slice(0, 10)` para mostrar una fecha de
calendario cruza por UTC antes de recortar el día. En America/Guatemala
(UTC-6, sin horario de verano), eso desplaza la fecha mostrada un día
hacia atrás. El mismo patrón (`new Date().toISOString().slice(0, 10)`
para el "hoy" de un registro nuevo, y `new Date(str).getTime() -
new Date(str).getTime()) / 86400000` para contar noches) seguía vivo en
`PrivateWorkspace.tsx`, `AdminContent.tsx`, `GuestModals.tsx` y
`OccupancyScreen.tsx` — no se había generalizado el fix.

El contrato ya distinguía dos tipos de fecha, documentado en los
comentarios de `shared/types/common.ts` y `shared/utils/date.ts` desde
antes de este PR, pero sin un ADR que lo registrara como decisión ni
una regla automática que lo hiciera cumplir:

- **Instante** (`created_at`, `paid_at`, `occurred_at`...): un momento
  exacto en el tiempo. El DTO es ISO 8601 con `Z` (UTC); el Model es
  `Date`; se muestra convertido a hora local (`formatTimeGT`).
- **Fecha de calendario** (`check_in`, `check_out`, `valid_from`,
  `valid_to`...): una etiqueta de día civil, sin hora. El DTO es
  `"YYYY-MM-DD"`; el Model **sigue siendo `Date`, pero anclado a
  medianoche local** — no un string. Se construye y se lee solo con
  `toDomainCalendarDate`/`toDtoCalendarDate` (getters/constructor
  locales, nunca UTC), y se muestra con `formatDateGT`.

Una versión anterior de este mismo ADR, en borrador, proponía cambiar
el Model de fecha de calendario a `string` ("se compara como string,
se muestra partiendo el string") para eliminar la clase de bug de raíz.
Se descartó antes de aceptarse: `toDomainCalendarDate`/
`toDtoCalendarDate` ya resuelven el problema correctamente cuando se
usan de forma consistente, y migrar el tipo del Model habría tocado
los mappers de `booking`/`rate`/`promotion` y cada pantalla que hace
noches, comparaciones u orden con esas fechas — un cambio de contrato
mucho más grande que el bug que lo motivó. El bug real nunca fue el
tipo del Model; fue usar `toISOString()`/`new Date(str)` a secas en vez
de los helpers que ya existían.

### Decisión

1. **El Model de fecha de calendario es `Date` a medianoche local.**
   Se construye y se serializa **solo** con `toDomainCalendarDate`/
   `toDtoCalendarDate` de `shared/types/common.ts`. Nunca
   `new Date(value)` a secas sobre un string de solo fecha (parsea como
   medianoche UTC) ni `.toISOString().slice(0, 10)` para volver a
   truncarlo (cruza por UTC en la dirección contraria).
2. **El Model de instante es `Date`**, vía `toDomainDate`/`toDtoDate`;
   el DTO es ISO 8601 con `Z`. Se muestra en hora local con
   `formatTimeGT`; nunca se necesita su día calendario directamente.
3. **Comparar dos fechas de calendario ya serializadas ("YYYY-MM-DD")
   no necesita `Date`**: la comparación de string (`a < b`, `a >= b`)
   es válida para ese formato y evita construir un `Date` innecesario
   (aplicado en `recIsRoomBlocked`/`recHasConflict` de
   `PrivateWorkspace.tsx`).
4. **Contar noches entre dos fechas de calendario usa
   `calculateNights()`** de `shared/utils/date.ts` (días civiles vía
   ancla UTC, nunca la resta cruda de milisegundos entre dos
   instancias de `Date`/86400000).
5. **El "hoy" de una operación de negocio** (fecha de un cargo/pago/
   depósito nuevo, día operativo) se calcula en hora local:
   `toDtoCalendarDate(new Date())`, nunca
   `new Date().toISOString().slice(0, 10)`.
6. **Convención de sufijo de campo, registrada hoy, aplicación
   pendiente**: un campo de instante termina en `_at` (`created_at`,
   `paid_at`); uno de fecha de calendario termina en `_date` o es el
   nombre semántico ya existente sin sufijo ambiguo (`check_in`,
   `valid_from`). Ningún campo del contrato se renombra todavía — ver
   "Qué queda pendiente".
7. **Prevención automática**: `eslint.config.js` prohíbe
   `.toISOString().slice(...)` fuera de `common.ts`/`date.ts` (regla
   `no-restricted-syntax`); `scripts/test-date.mjs` corre fijado a
   `TZ=America/Guatemala` y agrega un barrido estático del mismo patrón
   más `/86400000`, como respaldo de lo que el linter no puede decidir
   sin información de tipos.

### Consecuencias

- **Gana** el proyecto: el bug de 75ccc64 deja de ser un parche
  puntual — la regla de ESLint y el barrido estático de
  `test-date.mjs` impiden que alguien lo reintroduzca sin darse cuenta,
  y no exige tocar el contrato de datos ni las pantallas que ya
  consumen `Date` para estas fechas.
- **Cuesta**: `ReceptionContent.tsx`, `ReceptionModals.tsx` y
  `ReservationDetail.tsx` (front-desk) tenían el mismo patrón de
  `new Date(str)`/`86400000` y **no se corrigieron en este PR** —
  front-desk tiene trabajo en vuelo hoy y tocar esos archivos arriesga
  conflicto de merge. Quedan exceptuados explícitamente de la regla de
  ESLint y del barrido estático (ver ambos archivos), documentado ahí
  mismo y aquí.
- **A quién afecta**: a quien retome front-desk — debe cerrar esa
  excepción aplicando el mismo fix (usar `toDomainCalendarDate`/
  `calculateNights`/comparación de string) y retirar las tres
  exclusiones de `eslint.config.js` y `scripts/test-date.mjs` en el
  mismo cambio. A móvil (MOV-04), cuando se coordine la renombrada de
  sufijos del punto 6.

### Qué NO hacer

- **No usar `new Date(value)` a secas sobre un string de solo fecha**
  (`"YYYY-MM-DD"`, sin hora). Parsea como medianoche UTC y en
  America/Guatemala (UTC-6) se lee un día antes con getters locales.
  Usar `toDomainCalendarDate(value)`.
- **No usar `.toISOString().slice(0, 10)`** (ni ninguna variación) para
  obtener la fecha de calendario de un `Date`. Cruza por UTC. Usar
  `toDtoCalendarDate(date)`.
- **No restar `Date.getTime()` crudo entre dos fechas de calendario y
  dividir entre 86400000** para contar noches. El resultado puede
  coincidir por casualidad (ver Contexto: el desplazamiento se cancela
  cuando ambos operandos se parsean igual de mal), pero es frágil y
  queda fuera del contrato. Usar `calculateNights()`.
- **No reimplementar el formato de fecha por pantalla**
  (`toLocaleDateString`, o una función local como el
  `toDateInputValue`/`toCalendarTime` que tenía `OccupancyScreen.tsx`
  antes de este PR). `formatDateGT`/`formatTimeGT` son las únicas
  funciones de formato de fecha/hora del proyecto (ver `CLAUDE.md`).
- **No migrar el Model de fecha de calendario a `string`** sin que el
  equipo decida coordinar ese cambio de contrato — es la alternativa
  que este mismo ADR descartó (ver Contexto); reabrirla exige tocar
  mappers y pantallas de nuevo, no es una decisión de una sola persona
  dentro de un PR de datos.
- **No renombrar campos del contrato a `_at`/`_date` todavía** — ver
  "Qué queda pendiente".

### Qué queda pendiente

- **Renombrar los campos del contrato a la convención `_at`/`_date`**
  del punto 6 — coordinado con MOV-04 (móvil), porque el contrato de
  datos es fuente de verdad compartida y un rename unilateral desde
  la web rompe a móvil sin aviso.
- **Cerrar la excepción de front-desk** (`ReceptionContent.tsx`,
  `ReceptionModals.tsx`, `ReservationDetail.tsx`) en cuanto ese lote
  termine su trabajo en vuelo — ver Consecuencias.

### Alternativas consideradas

1. **Migrar el Model de fecha de calendario a `string`** — descartada,
   ver Contexto: resuelve la misma clase de bug pero con un costo de
   migración (mappers + pantallas consumidoras) desproporcionado al
   bug real, que era de uso indebido de `toISOString()`, no del tipo
   del Model.
2. **Solo documentar la convención, sin regla de ESLint ni test** —
   descartada: 75ccc64 ya demostró que documentar en comentarios no
   impidió que el mismo patrón reapareciera en cuatro archivos más
   durante la misma rama.
3. **Aplicar el fix también en front-desk dentro de este PR** —
   descartada por riesgo de conflicto: esos tres archivos tienen
   trabajo de otro colaborador en vuelo hoy: ver "Qué queda pendiente".

### Nota para la sesión de revisión de equipo

`scripts/test-router.mjs` tiene una prueba en rojo, pre-existente a
este PR (confirmado con `git stash` contra el commit previo a esta
rama): espera `PrivateNotFoundPage` en `/pms/housekeeping`,
`/pms/room-service` y `/pms/concierge`, pero el router resuelve
`PrivateSessionWorkspace`. Es la contradicción entre **D-008**
("Limpieza, Room Service y Conserjería viven solo en `pms-hotel-mobile`,
se sacan del menú web") y **D-009** ("la migración Bolt cablea esos
mismos tres módulos como respaldo web completo dentro de
`PrivateWorkspace`"). D-009 es la decisión más reciente y la que
efectivamente cableó el router, pero D-008 nunca se marcó como
reemplazada más allá de una nota en su encabezado — el equipo necesita
decidir explícitamente cuál de las dos prevalece (o si D-009 debe
actualizarse para reemplazar formalmente a D-008) antes de que alguien
intente "arreglar" el router o la prueba por su cuenta.

## Cómo agregar una nueva decisión

Copiar la estructura de D-001: **Contexto** (qué problema había y qué
evidencia lo sustenta), **Decisión** (qué se hizo), **Qué NO hacer**
(errores concretos que no se deben repetir) y **Alternativas consideradas**
(qué se descartó y por qué). Enlazar desde `docs/CONTRATO-DATOS.md` cuando
la decisión afecte una entidad del contrato.
