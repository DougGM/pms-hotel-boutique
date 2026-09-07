# Seguimiento del Proyecto

## Estado actual

- Base visual importada desde el proyecto Bolt `sb1-8sal4vhj`.
- Arquitectura de directorios alineada con el taller de frontend, incluyendo
  las capas `models`, `dtos`, `mappers`, `adapters`, `services` y `components`.
- Zonas web definidas: `src/public/` para vistas sin sesión, `src/private/`
  para el layout autenticado, `src/modules/` para dominios y `src/shared/`
  para reutilizables.
- Base de la app React Native creada en `mobile/` para empleados, con módulos
  de autenticación, tareas, habitaciones, solicitudes y pedidos.
- Rutas base navegables configuradas para `/`, `/login` y `/pms`, con layouts
  separados para la web pública y privada.
- WEB-02: router conectado al catálogo tipado de `src/app/routes.ts`, con
  `/auth/login` y `/pms/dashboard` disponibles y las entradas anteriores
  conservadas. Páginas 404 pública y privada con enlaces de retorno; las
  rutas desconocidas bajo `/pms/` mantienen el menú operativo.
- WEB-03: sistema de diseno web centralizado en `src/styles/tokens.css`, usando
  la extraccion de WEB-08 para paleta, tipografia, espaciado, radios y colores
  por estado de reserva/habitacion. La documentacion vive en
  `src/styles/README.md`.
- Cliente HTTP centralizado configurado con `VITE_API_BASE_URL` desde `.env`.
- WEB-06 (#18): implementación en `feat/web-06-auth-role-guards`, con login
  simulado, sesión persistente, guardas y menú por rol. El usuario confirmó
  que sus pruebas manuales funcionan correctamente después del ajuste visual.
  WEB-05 ya se incorporó a esta rama desde `develop` (`3efa3f7`). Se conectó
  el servicio compartido, eliminando el adaptador aislado y usando los cuatro
  roles actuales. Pendiente repetir la revisión manual con las nuevas cuentas;
  no integrada en `develop` ni cerrada. Commits iniciales: `1ebe036` y `2082a33`.
- Ajuste visual de WEB-06: formulario de login con clase y estilos propios,
  sin el ancho fijo ni la sombra del modal heredado; campos y botón ajustados
  al contenedor, con padding adaptable para pantallas pequeñas.
- La UI funcional sigue centralizada temporalmente en `src/app/App.tsx` y sus
  componentes de apoyo en `src/components/`.

## Prioridad inmediata

- WEB-02 ([issue #14](https://github.com/DougGM/pms-hotel-boutique/issues/14)):
  implementación integrada en `develop` desde `feat/web-02-routing-layouts`
  mediante merge, con commit de implementación `49be302` y documentación
  `683e05d`. El issue sigue abierto; queda confirmar la revisión visual de las
  páginas 404 antes del cierre. No se creó un PR para esta integración.
- Fase 0 ([issue #9](https://github.com/DougGM/pms-hotel-boutique/issues/9)):
  seguimiento conjunto; completar cuando estén terminadas las tareas que agrupa.

- Migrar las vistas de recepción a `modules/reservations`, `modules/stays` y
  `modules/billing` sin alterar la experiencia visual.
- Extraer los tipos y datos de demostración de `src/app/App.tsx` a sus módulos.
- Conectar las rutas nuevas con las vistas de cada módulo conforme se
  implementen, manteniendo los layouts público y privado existentes.

## Pendiente por módulo

| Módulo                    | Estado             | Próximo paso                         |
| ------------------------- | ------------------ | ------------------------------------ |
| Auth                      | Conectada a WEB-05 | Revisar cuatro roles y hacer merge   |
| Reservaciones y recepción | UI existente       | Separar datos, lógica y vistas       |
| Housekeeping              | UI existente       | Migrar a módulo propio               |
| Room service              | UI existente       | Migrar pedidos y menú                |
| Huésped                   | UI existente       | Dividir vistas por ruta              |
| Administración            | UI existente       | Separar los dominios administrativos |
| Módulos restantes         | Estructura creada  | Implementar según prioridad          |

## Decisiones

- Se conserva Vite en vez de migrar a Next.js. El PDF se usa como contrato de
  arquitectura y rutas, mientras que Vite permite reutilizar directamente el
  proyecto entregado por Bolt.
- `src/index.css` es la fuente visual que debe preservarse durante toda la
  migración, consumiendo los tokens importados desde `src/styles/tokens.css`.
- No introducir bibliotecas visuales adicionales sin una necesidad concreta.
- Consultar `src/ARCHITECTURE.md` antes de crear archivos web y
  `mobile/README.md` antes de crear archivos móviles.
- Copiar `.env.example` a `.env` para desarrollo local y ejecutar `npm run
check` antes de publicar cambios.

## Verificación más reciente

- `npm run check` completado correctamente: Prettier, TypeScript, ESLint y
  compilación de producción sin errores. Vite advierte que los datos de
  Browserslist están desactualizados.
- `npm run test:auth`: 14 pruebas con el árbol de rutas y servicio compartido;
  incluyen los cuatro roles, las 404, contraseña incorrecta, persistencia,
  token HTTP, cancelación y limpieza local aunque falle el cierre remoto.
- WEB-06: revisión manual confirmada por el usuario después del ajuste visual.
  No se registró el detalle de dispositivos ni de cada caso manual. No hubo
  navegador disponible para verificación visual automatizada del agente.
