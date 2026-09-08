# Autenticación del personal — WEB-06 con WEB-05

## Contrato

El flujo es `StaffLoginPage` → `AuthProvider` → fachada de `modules/auth/services`
→ `services/authService.ts`. La fachada agrega permisos de navegación a
`AuthSession`; no guarda datos ni conoce fixtures. `SessionUserDTO`,
`LoginDTO`, `AuthResponseDTO` y `AuthSession` viven en
`shared/types/entities/session/` (no en el barrel general de `shared/types/entities`);
`UserRole` viene de `shared/types/common` (ADMIN, RECEPTIONIST, MANAGER y STAFF).

**No usar `shared/types/entities/user/`** para esta integración: ese contrato
modela el rol de puesto de un empleado en el directorio de personal
(admin/manager/frontDesk/housekeeping/maintenance, alineado con la app móvil),
no el rol de acceso al PMS. Son dos conceptos distintos que comparten nombre;
`shared/types/entities/session/` existe justamente para no confundirlos ni
duplicar el DTO de usuario en dos formas incompatibles.

## Cuentas y permisos

Contraseña pública de demostración: `AuroraDemo2026!`.

| Cuenta                       | Rol          | Entradas visibles y permitidas                                         |
| ---------------------------- | ------------ | ---------------------------------------------------------------------- |
| admin@hotelboutique.test     | ADMIN        | Panel, recepción, limpieza, room service, conserjería, caja y usuarios |
| recepcion@hotelboutique.test | RECEPTIONIST | Panel y recepción                                                      |
| gerente@hotelboutique.test   | MANAGER      | Panel y áreas operativas/caja; sin gestión de usuarios                 |
| personal@hotelboutique.test  | STAFF        | Panel, limpieza, room service y conserjería                            |

La matriz de navegación vive en `models/session.ts`; los enlaces y las guardas
comparten esta política. El contrato actual no distingue departamentos dentro
de STAFF. Si el equipo introduce permisos más específicos, ajustar la matriz
y las pruebas junto con ese contrato. Las secciones siguen siendo provisionales;
este cambio no implementa sus funciones de negocio.

## Persistencia y cierre

WEB-05 es el único propietario de `PMS_AUTH_SESSION` y del token de `httpClient`.
`login` valida correo y contraseña, persiste el DTO y devuelve una `AuthSession`
con fechas de dominio. La sesión vence ocho horas después del login, sin cierre
por inactividad ni renovación al navegar. `getCurrentSession` restaura la fecha,
comprueba vencimiento/estructura y reconstruye el usuario desde los datos mock,
sin confiar en roles editados en el almacenamiento. `getCurrentUser` conserva
su API y delega en la misma recuperación.

`logout` elimina inmediatamente persistencia y token HTTP, antes de la latencia
y del posible error simulado. `clearSession` es la limpieza local síncrona que
comparte esa operación. Las solicitudes canceladas u obsoletas no guardan
credenciales. AuthProvider cancela operaciones al desmontarse, recuperar otra
sesión o cerrar sesión; el evento storage sincroniza cambios entre pestañas.

Las cuentas antiguas `@hotel.test` y la clave `hotel-aurora.auth.v1` se retiran:
es necesario iniciar sesión de nuevo. También se invalidan sesiones antiguas
de WEB-05 con el token genérico o un vencimiento fuera del nuevo plazo.

Todo sigue siendo una demo: los tokens y contraseñas son públicos y manipulables;
la autorización real debe validarse en el servidor al integrar un backend.

## Errores y pruebas

Se usan los mecanismos de WEB-05: `mockUtils.setForceError(true)`,
`?mockError=true` o `PMS_FORCE_MOCK_ERROR=true` en localStorage. Desactivarlos
permite reintentar. Ya no se utiliza `VITE_AUTH_FORCE_ERROR`.

`npm run test:auth` ejecuta 14 pruebas con React Test Renderer, React Router en
memoria y el servicio compartido real de la demo. Cubren login y contraseñas,
cuatro roles, URLs denegadas, retorno seguro, persistencia, vencimiento, 404,
recuperación ante errores, sesión corrupta, cambios entre pestañas, token HTTP,
logout con error simulado, migración del almacenamiento y cancelación del login.

El usuario confirmó las pruebas manuales de la versión conectada a WEB-05 y
autorizó integrarla el 2026-09-07. WEB-06 se integra en `develop` sin conflictos.
Las pruebas automáticas y la revisión manual están aprobadas; el merge no
cierra automáticamente la issue #18.

Para futuras regresiones: probar las cuatro cuentas, contraseña incorrecta,
recarga, acceso a una sección ajena, cierre y navegación Atrás/Adelante.
