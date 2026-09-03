# Contexto para Agentes

## Proyecto

PMS Hotel Boutique para Hotel Aurora. La interfaz original proviene del ZIP de
Bolt `project-bolt-sb1-8sal4vhj.zip`; su CSS y comportamiento existente son la
referencia visual y funcional.

## Arquitectura objetivo

Seguir el documento `Taller de Arquitectura y Desglose Frontend.pdf`:

- `src/app/`: vistas públicas, de huésped y del PMS interno.
- `src/modules/<dominio>/`: `models`, `dtos`, `adapters`, `services` y
  `components`.
- `src/shared/components/`: piezas genéricas reutilizables.

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
- Poner modelos, DTOs, adaptadores y servicios en el módulo que les corresponde.
- Actualizar `PROJECT_STATUS.md` al cerrar cambios relevantes.

## Estado de la migración

La estructura ya está creada. La UI de Bolt permanece inicialmente en
`src/app/App.tsx` y `src/components/` para conservar el diseño. El siguiente
trabajo recomendado es extraer recepción y reservaciones a módulos de dominio.
