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
- Cliente HTTP centralizado configurado con `VITE_API_BASE_URL` desde `.env`.
- La UI funcional sigue centralizada temporalmente en `src/app/App.tsx` y sus
  componentes de apoyo en `src/components/`.

## Prioridad inmediata

- Migrar las vistas de recepción a `modules/reservations`, `modules/stays` y
  `modules/billing` sin alterar la experiencia visual.
- Extraer los tipos y datos de demostración de `src/app/App.tsx` a sus módulos.
- Incorporar un enrutador de cliente que represente las rutas documentadas.

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

## Verificación más reciente

- `npm run build` completado correctamente.
- `npm run check` completado correctamente: Prettier, TypeScript, ESLint y
  compilación de producción sin errores ni advertencias.
