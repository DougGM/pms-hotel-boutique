# Aviso: roles finales de login y permisos

Fecha: 2026-09-12

Durante la revision de roles se detecto que las issues cerradas `#18`
(WEB-06, shell de autenticacion y guardas por rol) y `#24` (WEB-12, datos
mock de roles/permisos) dejaron una base tecnica funcional, pero no terminaron
de alinear los roles finales del producto.

Antes convivian roles de sesion genericos:

- `ADMIN`
- `RECEPTIONIST`
- `MANAGER`
- `STAFF`

Y roles operativos/catalogo separados:

- `admin`
- `manager`
- `front_desk`
- `housekeeping`
- `maintenance`
- `room_service`
- `concierge`

## Decision aplicada

Se actualizaron los roles de sesion/login a roles funcionales finales:

- `ADMIN`
- `GUEST`
- `RECEPTION`
- `HOUSEKEEPING`
- `CONCIERGE`
- `ROOM_SERVICE`

Tambien se alineo el catalogo operativo compartido (`user.role`/`rolesDB`) a
los mismos roles, en formato de datos:

- `admin`
- `guest`
- `reception`
- `housekeeping`
- `concierge`
- `room_service`

`permissionsDB` conserva sus llaves actuales porque representan acciones, no
roles. El directorio `usersDB` sigue siendo personal operativo; por eso no es
obligatorio tener usuarios tipo `guest` ahi aunque el rol exista para login y
catalogo.

## Cuentas mock para pruebas

Todas usan la contrasena publica de demo `AuroraDemo2026!`.

| Correo                         | Rol            |
| ------------------------------ | -------------- |
| `admin@hotelboutique.test`     | `ADMIN`        |
| `huesped@hotelboutique.test`   | `GUEST`        |
| `recepcion@hotelboutique.test` | `RECEPTION`    |
| `limpieza@hotelboutique.test`  | `HOUSEKEEPING` |
| `conserjeria@hotelboutique.test` | `CONCIERGE`  |
| `roomservice@hotelboutique.test` | `ROOM_SERVICE` |

## Notas de alcance

- `GUEST` ya puede iniciar sesion, pero el portal de huesped sigue pendiente.
- `CONCIERGE` se conserva como literal interno; la UI puede mostrar
  "Conserjeria" para mantener el termino hotelero.
- No mezclar `HOUSEKEEPING` con `CONCIERGE`: limpieza y conserjeria son flujos
  operativos distintos.
- Cualquier cambio futuro a literales de roles debe actualizar permisos,
  navegacion, mocks, tests y documentacion en el mismo cambio.