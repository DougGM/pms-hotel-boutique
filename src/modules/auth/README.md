# Autenticación del personal — WEB-06

## Alcance y dependencia

Login por correo y contraseña, sesión tipada, persistencia de ocho horas,
guardas de sesión y permisos, menú por rol y cierre de sesión. Las cuentas
de demostración están documentadas en el README principal. No se implementan
registro, recuperación de contraseña ni autenticación de huéspedes.

WEB-05 (#17) sigue abierta. `adapters/mock-auth.ts` es un adaptador provisional
exclusivo de auth; no sustituye la capa compartida ni su contrato pendiente.
Los seis roles y sus permisos son provisionales y requieren coordinación con
WEB-09/WEB-12. Administración puede entrar a todas las secciones; los otros
roles tienen acceso al panel y a su área. No hay un backend que haga cumplir
estos permisos: las guardas controlan únicamente la navegación de la demo.

## Flujo

`StaffLoginPage` → contexto → `authService` → adaptador → DTO → mapper → sesión.
Las pantallas no importan fixtures. El adaptador simula 350 ms de latencia;
para ejercitar fallos configurar `VITE_AUTH_FORCE_ERROR=true` en `.env` y
reiniciar Vite. Volver a `false` y reiniciar para comprobar el reintento.

`AuthProvider` envuelve el router. Restaura la sesión antes de mostrar rutas
privadas, descarta respuestas asíncronas obsoletas y atiende el evento
`storage` para sincronizar pestañas. Al vencer la sesión la elimina.

La clave `hotel-aurora.auth.v1` guarda únicamente versión, identificador de
usuario y vencimiento. El servicio recupera el usuario y reconstruye permisos
desde su fuente de datos; no acepta permisos serializados del navegador.
Una sesión corrupta, desconocida o vencida se elimina. El fallo de persistencia
impide completar el login; los errores de recuperación permiten reintentar.
Este identificador local es manipulable: al integrar el backend se deberá
sustituir por autenticación y autorización validadas por el servidor.

Las rutas se declaran en `src/app/routes.ts`. `private/routes/navigation.ts`
asocia entradas con permisos y sirve al menú y al árbol de rutas. Las entradas
de módulo son provisionales; las rutas anidadas desconocidas conservan la 404
privada después de comprobar el permiso. Un retorno tras login solo admite
rutas internas del área PMS.

## Verificación

`npm run test:auth` ejecuta pruebas con React Test Renderer y React Router
en memoria. Se mantiene el árbol real de rutas; únicamente se sustituye el
historial del navegador por memoria y se omite CSS al compilar las pruebas.

Casos: acceso anónimo, credenciales incorrectas y reintento, retorno al destino,
menús de los seis roles, bloqueo por URL, recarga, cierre entre pestañas, 404,
sesión corrupta/vencida, permisos serializados, fallo de almacenamiento,
vencimiento con la app abierta y recuperación tras fallo del servicio.

Revisión manual pendiente: abrir en escritorio y móvil, probar los seis roles,
recargar una sección, introducir una URL de otro rol, abrir dos pestañas y cerrar
sesión. Comprobar mensajes, navegación por teclado y menú en pantalla estrecha.
