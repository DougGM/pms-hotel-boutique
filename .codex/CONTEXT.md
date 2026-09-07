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
- `src/layouts/`: layouts React Router por sección.
- `src/services/http-client.ts`: cliente HTTP centralizado; toma la URL base de
  `VITE_API_BASE_URL` en `.env`.
- `src/assets/` y `src/styles/`: recursos estáticos y tokens visuales.

Consultar `src/ARCHITECTURE.md` antes de crear archivos. Solo código usado por
dos o más áreas va en `shared/`; toda lógica específica se conserva en su
respectivo módulo. No agregar trabajo nuevo a `src/app/` ni `src/components/`:
son código temporal heredado de Bolt y se migrará gradualmente. La configuración
de navegación en `src/app/router.tsx` y su catálogo en `src/app/routes.ts`
son excepciones a esta regla.

El proyecto usa Vite, no Next.js. La navegación se configura explícitamente
con React Router en `src/app/router.tsx`, que consume `routePaths` desde
`src/app/routes.ts`. Las rutas base son `/`, `/auth/login` y `/pms/dashboard`;
`/login` y `/pms` siguen disponibles por compatibilidad. Hay páginas 404 en
ambos layouts y las rutas desconocidas bajo `/pms/` conservan el menú privado.
WEB-06 añade `AuthProvider` en `main.tsx` y guardas de sesión/permisos; el menú
consume `private/routes/navigation.ts`. Sin sesión, el área PMS redirige al
login. Auth usa un adaptador provisional mientras WEB-05/WEB-09/WEB-12 definen
los servicios y permisos compartidos; consultar `src/modules/auth/README.md`.
No confiar en el nombre de un archivo para crear una ruta.

## Reglas de trabajo

- Preservar `src/index.css`; reutilizar sus clases y variables antes de añadir
  estilos nuevos.
- Mantener TypeScript estricto y el alias `@/`.
- Copiar `.env.example` a `.env` antes de consumir servicios. Nunca versionar
  credenciales ni modificar la URL base dentro del código.
- Ejecutar `npm run check` antes de publicar cambios: valida Prettier,
  TypeScript, ESLint y la compilación.
- Ejecutar `npm run test:auth` al modificar sesión, permisos o navegación.
- Migrar de forma incremental: no eliminar UI funcional de `src/app/App.tsx`
  hasta que su reemplazo esté conectado y verificado.
- Poner modelos, DTOs, mappers, adaptadores y servicios en el módulo que les
  corresponde. Los mappers traducen DTOs, respuestas externas y modelos de UI
  al modelo de dominio; no debe haber esa conversión dispersa en las vistas.
- Actualizar los documentos `.md` afectados conforme avance el trabajo:
  `PROJECT_STATUS.md` para estado y verificaciones, `README.md` para uso y
  `.codex/CONTEXT.md` y `src/ARCHITECTURE.md` para continuidad y arquitectura.
  Distinguir implementación publicada de integración y cierre del issue.

## Estado de la migración

La estructura ya está creada. La UI de Bolt permanece inicialmente en
`src/app/App.tsx` y `src/components/` para conservar el diseño. El siguiente
trabajo recomendado es extraer recepción y reservaciones a módulos de dominio.

## Aplicación móvil

La futura app React Native está en `mobile/` y es solo para empleados. Cada
feature móvil usa `models`, `dtos`, `mappers`, `services`, `components` y
`screens`. Revisar `mobile/README.md` y `NEXT_CONTRIBUTOR.md` antes de iniciar.
