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
  roles actuales (adaptación `eeb22fe`). El usuario confirmó las pruebas de esta
  versión y autorizó el merge el 2026-09-07: integrada en `develop` sin conflictos.
  El estado de la issue no se modifica automáticamente con este merge.
- Ajuste visual de WEB-06: formulario de login con clase y estilos propios,
  sin el ancho fijo ni la sombra del modal heredado; campos y botón ajustados
  al contenedor, con padding adaptable para pantallas pequeñas.
- WEB-04 (#16): primitivos de formulario implementados en
  `feat/web-04-form-primitives`, integrado a `develop` mediante PR #30
  (merge `2c28e43ba15a5a36c4ac5a562924d52fde610c58`) — `Button` (variantes primary/secondary/ghost/danger,
  tamaños, `disabled`, `loading`), `Input` y `Select` (`label`, `helpText`,
  `error`, `disabled`, `aria-invalid`/`aria-describedby`), `Modal` (controlado,
  cierre con Escape y clic en el overlay, gestión y restauración de foco,
  bloqueo/restauración del scroll del body, nombre accesible obligatorio por
  tipos) y `DatePickerRange` (rango de estadía, impide un rango invertido y una
  estadía de cero noches, marca e impide seleccionar fechas no disponibles,
  impide un rango que atraviese una fecha no disponible, mensajes de
  validación internos, `disabled`, `minDate` configurable). Todos en
  `src/shared/components/`, consumiendo los tokens de WEB-03
  (`src/styles/tokens.css`) sin modificarlo. Sin dependencias nuevas.
- WEB-07 (#19): utilidades de formato de moneda y fecha implementadas en
  `feat/web-07-format-utils` (rama publicada en origin, pendiente de
  integración a `develop`). `formatCurrency` (GTQ, `Q1,250.00`) como única
  función de formato de moneda; `formatDateGT`/`formatTimeGT`/
  `formatStayRange`/`calculateNights` para fecha, hora, rango de estadía y
  noches. Contrato explícito de fecha civil (`toDomainCalendarDate`/
  `toDtoCalendarDate`, DTO `"YYYY-MM-DD"`) frente a timestamp (`toDomainDate`/
  `toDtoDate`, ISO 8601 completo), evitando el desplazamiento de día que
  produciría `new Date()` sobre un string ambiguo. Migración a enteros en
  centavos de los contratos legacy activos (`Payment.amountCents`,
  `Room.pricePerNightCents`, `Booking.pricePerNightCents`/
  `totalAmountCents`, `Product.priceCents`), todos con `currency: Currency`
  explícita; normalización de las fechas mock de `lot-b.ts` al mismo
  contrato. Cobertura de regresión dedicada (ver Verificación más reciente).
  Detalle técnico completo en [src/shared/README.md](src/shared/README.md).
  **AC5 (alineación con la app móvil) pendiente de validación**: el
  repositorio no contiene todavía implementación ni especificación de
  formato mobile con la que comparar; no se afirma cumplimiento sobre esa
  base.
- La UI completa heredada de Bolt permanece en `src/app/App.tsx` y sus
  componentes de apoyo en `src/components/`, todavía sin migrar a los módulos
  de dominio. La arquitectura activa parte de `src/main.tsx` (que arranca
  `src/app/router.tsx` y las páginas de `src/private/`/`src/public/`);
  `App.tsx`/`src/components/` están excluidos de `tsconfig.app.json`, no son
  alcanzados desde `src/main.tsx` y no aparecen en el bundle de producción
  compilado (verificado en la auditoría de WEB-07).

## Prioridad inmediata

- WEB-02 ([issue #14](https://github.com/DougGM/pms-hotel-boutique/issues/14)):
  implementación integrada en `develop` desde `feat/web-02-routing-layouts`
  mediante merge, con commit de implementación `49be302` y documentación
  `683e05d`. El usuario confirmó que ambas páginas 404 funcionan correctamente;
  WEB-02 cumple sus verificaciones. No se creó un PR para esta integración.
- Fase 0 ([issue #9](https://github.com/DougGM/pms-hotel-boutique/issues/9)):
  seguimiento conjunto; completar cuando estén terminadas las tareas que agrupa.

- Migrar las vistas de recepción a `modules/reservations`, `modules/stays` y
  `modules/billing` sin alterar la experiencia visual.
- Extraer los tipos y datos de demostración de `src/app/App.tsx` a sus módulos.
- Conectar las rutas nuevas con las vistas de cada módulo conforme se
  implementen, manteniendo los layouts público y privado existentes.

## Pendiente por módulo

| Módulo                    | Estado              | Próximo paso                         |
| ------------------------- | ------------------- | ------------------------------------ |
| Auth                      | Integrada y probada | Integrar las vistas de cada módulo   |
| Reservaciones y recepción | UI existente        | Separar datos, lógica y vistas       |
| Housekeeping              | UI existente        | Migrar a módulo propio               |
| Room service              | UI existente        | Migrar pedidos y menú                |
| Huésped                   | UI existente        | Dividir vistas por ruta              |
| Administración            | UI existente        | Separar los dominios administrativos |
| Módulos restantes         | Estructura creada   | Implementar según prioridad          |

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
- WEB-06: revisión manual confirmada por el usuario también después de conectar
  WEB-05 y adaptar los cuatro roles compartidos, antes del merge a `develop`.
  No se registró el detalle de dispositivos ni de cada caso manual. No hubo
  navegador disponible para verificación visual automatizada del agente.
- WEB-04: `npm run typecheck`, `npm run lint` y `npm run build` sin errores;
  Prettier verificado únicamente sobre los 9 archivos nuevos de
  `src/shared/components/` (todos conformes). Hallazgo preexistente y no
  relacionado con WEB-04: `npm run format:check` falla en 123 archivos fuera
  de su alcance; no se corrigió, queda fuera de este ticket.
- WEB-07: `scripts/test-currency.mjs` 11/11, `scripts/test-date.mjs` 35/35,
  `scripts/test-money-contract.mjs` 13/13 (59 pruebas en total, todas contra
  datos y funciones reales del repositorio, sin dependencias nuevas); `npm run
  typecheck`, `npm run lint` y `npm run build` sin errores. Auditoría de
  legacy UI (`src/app/App.tsx`, `src/components/`) confirmada como excluida
  del typecheck, no alcanzada desde `src/main.tsx` y ausente del bundle de
  producción compilado (`dist/`); no se modificó esa capa.
