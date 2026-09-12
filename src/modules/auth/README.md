# Autenticacion del personal - WEB-06 con WEB-05

## Contrato

El flujo es `StaffLoginPage` -> `AuthProvider` -> fachada de `modules/auth/services`
-> `services/authService.ts`. La fachada agrega permisos de navegacion a
`AuthSession`; no guarda datos ni conoce fixtures. `SessionUserDTO`,
`LoginDTO`, `AuthResponseDTO` y `AuthSession` viven en
`shared/types/entities/session/` (no en el barrel general de `shared/types/entities`);
`UserRole` viene de `shared/types/common` (ADMIN, GUEST, RECEPTION, HOUSEKEEPING,
CONCIERGE y ROOM_SERVICE).

**`shared/types/entities/user/`** modela el rol del directorio de personal
(admin/guest/reception/housekeeping/concierge/roomService) y debe mantenerse
alineado con los roles de acceso del PMS. `shared/types/entities/session/`
sigue existiendo para modelar token, expiracion y permisos de navegacion.

## Cuentas y permisos

Contrasena publica de demostracion: `AuroraDemo2026!`.

| Cuenta                         | Rol          | Entradas visibles y permitidas                                         |
| ------------------------------ | ------------ | ---------------------------------------------------------------------- |
| admin@hotelboutique.test       | ADMIN        | Panel, recepcion, limpieza, room service, conserjeria, caja y usuarios |
| huesped@hotelboutique.test     | GUEST        | Panel general; portal de huesped pendiente                             |
| recepcion@hotelboutique.test   | RECEPTION    | Panel, recepcion y operacion front desk                                |
| limpieza@hotelboutique.test    | HOUSEKEEPING | Panel y limpieza                                                       |
| conserjeria@hotelboutique.test | CONCIERGE    | Panel y conserjeria                                                    |
| roomservice@hotelboutique.test | ROOM_SERVICE | Panel y room service                                                   |

La matriz de navegacion vive en `models/session.ts`; los enlaces y las guardas
comparten esta politica. El contrato ya distingue departamentos operativos desde
la sesion. Si el equipo cambia literales o agrega portal de huesped, ajustar la
matriz y las pruebas junto con ese contrato. Las secciones siguen siendo
provisionales; este cambio no implementa sus funciones de negocio.

## Persistencia y cierre

WEB-05 es el unico propietario de `PMS_AUTH_SESSION` y del token de `httpClient`.
`login` valida correo y contrasena, persiste el DTO y devuelve una `AuthSession`
con fechas de dominio. La sesion vence ocho horas despues del login, sin cierre
por inactividad ni renovacion al navegar. `getCurrentSession` restaura la fecha,
comprueba vencimiento/estructura y reconstruye el usuario desde los datos mock,
sin confiar en roles editados en el almacenamiento. `getCurrentUser` conserva
su API y delega en la misma recuperacion.

`logout` elimina inmediatamente persistencia y token HTTP, antes de la latencia
y del posible error simulado. `clearSession` es la limpieza local sincrona que
comparte esa operacion. Las solicitudes canceladas u obsoletas no guardan
credenciales. AuthProvider cancela operaciones al desmontarse, recuperar otra
sesion o cerrar sesion; el evento storage sincroniza cambios entre pestanas.

Las cuentas antiguas `@hotel.test` y la clave `hotel-aurora.auth.v1` se retiran:
es necesario iniciar sesion de nuevo. Tambien se invalidan sesiones antiguas
de WEB-05 con el token generico o un vencimiento fuera del nuevo plazo.

Todo sigue siendo una demo: los tokens y contrasenas son publicos y manipulables;
la autorizacion real debe validarse en el servidor al integrar un backend.

## Errores y pruebas

Se usan los mecanismos de WEB-05: `mockUtils.setForceError(true)`,
`setDelay(ms)` y `reset()`. Un error al recuperar sesion muestra una pantalla que
permite reintentar. Ya no se utiliza `VITE_AUTH_FORCE_ERROR`.

`npm run test:auth` ejecuta 14 pruebas con React Test Renderer, React Router en
memoria y el servicio compartido real de la demo. Cubren login y contrasenas,
seis roles, URLs denegadas, retorno seguro, persistencia, vencimiento, 404,
recuperacion ante errores, sesion corrupta, cambios entre pestanas, token HTTP,
logout con error simulado, migracion del almacenamiento y cancelacion del login.

El usuario confirmo las pruebas manuales de la version conectada a WEB-05 y
autorizo integrarla el 2026-09-07. WEB-06 se integra en `develop` sin conflictos.
Las pruebas automaticas y la revision manual estan aprobadas; el merge no
cierra automaticamente la issue #18.

Para futuras regresiones: probar las seis cuentas, contrasena incorrecta,
recarga, acceso a una seccion ajena, cierre y navegacion Atras/Adelante.
