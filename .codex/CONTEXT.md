# Contexto para Agentes

## Proyecto

PMS Hotel Boutique para Hotel Aurora. La interfaz original proviene del ZIP de
Bolt `project-bolt-sb1-8sal4vhj.zip`; su CSS y comportamiento existente son la
referencia visual y funcional.

## Arquitectura objetivo

Seguir el documento `Taller de Arquitectura y Desglose Frontend.pdf`:

- `src/public/`: vistas sin sesión. `page.tsx` es su entrada; usar `pages/`
  para vistas adicionales y `components/` para piezas exclusivas de esta zona.
- `src/private/`: zona autenticada. `page.tsx` contiene el layout y menú;
  usar `pages/` para vistas compuestas, `guards/` para sesión/permisos,
  `routes/` para navegación y `components/` para piezas del layout.
- `src/modules/<dominio>/`: `models`, `dtos`, `mappers`, `adapters`,
  `services` y `components`.
- `src/shared/components/`: piezas genéricas reutilizables.

Consultar `src/ARCHITECTURE.md` antes de crear archivos. Solo código usado por
dos o más áreas va en `shared/`; toda lógica específica se conserva en su
respectivo módulo. No agregar trabajo nuevo a `src/app/` ni `src/components/`:
son código temporal heredado de Bolt y se migrará gradualmente.

El proyecto usa Vite, no Next.js. Conserva la intención de las rutas del PDF,
pero no añadas archivos `page.tsx` con la expectativa de que Vite los enrute
automáticamente. Cuando se implemente navegación, usa un enrutador de cliente
o una capa de rutas explícita.

## Reglas de trabajo

- Preservar `src/index.css`; reutilizar sus clases y variables antes de añadir
  estilos nuevos.
- Mantener TypeScript estricto y el alias `@/`.
- Migrar de forma incremental: no eliminar UI funcional de `src/app/App.tsx`
  hasta que su reemplazo esté conectado y verificado.
- Poner modelos, DTOs, mappers, adaptadores y servicios en el módulo que les
  corresponde. Los mappers traducen DTOs, respuestas externas y modelos de UI
  al modelo de dominio; no debe haber esa conversión dispersa en las vistas.
- Actualizar `PROJECT_STATUS.md` al cerrar cambios relevantes.

## Estado de la migración

La estructura ya está creada. La UI de Bolt permanece inicialmente en
`src/app/App.tsx` y `src/components/` para conservar el diseño. El siguiente
trabajo recomendado es extraer recepción y reservaciones a módulos de dominio.

## Aplicación móvil

La futura app React Native está en `mobile/` y es solo para empleados. Cada
feature móvil usa `models`, `dtos`, `mappers`, `services`, `components` y
`screens`. Revisar `mobile/README.md` y `NEXT_CONTRIBUTOR.md` antes de iniciar.
