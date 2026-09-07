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
- Cliente HTTP centralizado configurado con `VITE_API_BASE_URL` desde `.env`.
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

| Módulo                    | Estado            | Próximo paso                         |
| ------------------------- | ----------------- | ------------------------------------ |
| Auth                      | Estructura creada | Modelos y pantallas de acceso        |
| Reservaciones y recepción | UI existente      | Separar datos, lógica y vistas       |
| Housekeeping              | UI existente      | Migrar a módulo propio               |
| Room service              | UI existente      | Migrar pedidos y menú                |
| Huésped                   | UI existente      | Dividir vistas por ruta              |
| Administración            | UI existente      | Separar los dominios administrativos |
| Módulos restantes         | Estructura creada | Implementar según prioridad          |

## Decisiones

- Se conserva Vite en vez de migrar a Next.js. El PDF se usa como contrato de
  arquitectura y rutas, mientras que Vite permite reutilizar directamente el
  proyecto entregado por Bolt.
- `src/index.css` es la fuente visual que debe preservarse durante toda la
  migración.
- No introducir bibliotecas visuales adicionales sin una necesidad concreta.
- Consultar `src/ARCHITECTURE.md` antes de crear archivos web y
  `mobile/README.md` antes de crear archivos móviles.
- Copiar `.env.example` a `.env` para desarrollo local y ejecutar `npm run
check` antes de publicar cambios.

## Verificación más reciente

- `npm run check` completado correctamente: Prettier, TypeScript, ESLint y
  compilación de producción sin errores. Vite advierte que los datos de
  Browserslist están desactualizados.
- WEB-02: 12 casos de resolución y renderizado verificados con React Router
  en memoria: entradas públicas y privadas, alias, barra final, rutas
  inexistentes anidadas, conservación del menú y enlaces de retorno.
- La revisión visual en navegador queda pendiente: no había un navegador
  disponible en la sesión de implementación.
