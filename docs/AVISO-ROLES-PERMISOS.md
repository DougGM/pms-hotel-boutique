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
roles. Para la pantalla administrativa de usuarios, `personnelService.getUsers`
usa `sessionAccountsDB` como fuente base: esos son los usuarios/roles que se
usan para login y para gestionar accesos visibles en el frontend beta.
`usersDB` queda como directorio operativo historico del Lote D, no como la
fuente visible principal de gestion de usuarios.

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

- `GUEST` inicia sesion y entra al portal de huesped. El portal usa servicios
  mock para reservas, pedidos, solicitudes, perfil y notificaciones; no es
  autenticacion de produccion.
- `CONCIERGE` se conserva como literal interno; la UI puede mostrar
  "Conserjeria" para mantener el termino hotelero.
- No mezclar `HOUSEKEEPING` con `CONCIERGE`: limpieza y conserjeria son flujos
  operativos distintos.
- Cualquier cambio futuro a literales de roles debe actualizar permisos,
  navegacion, mocks, tests y documentacion en el mismo cambio.
