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
login. Auth consume `services/authService.ts` de WEB-05; usa los tipos del
barrel `shared/types/entities` y los cuatro roles de `shared/types/common`.
Consultar `src/modules/auth/README.md` para contrato y permisos.
No confiar en el nombre de un archivo para crear una ruta.

## Continuidad de WEB-06

- Rama publicada: `feat/web-06-auth-role-guards`. Commits `1ebe036` y `2082a33`.
- El usuario confirmó que la prueba manual funciona bien tras corregir el
  desbordamiento del formulario. Los estilos propios evitan el modal heredado.
- WEB-05 ya llegó a `develop` (merge `3efa3f7`) y se incorporó a esta rama.
  Se retiró el adaptador aislado: sesión y token HTTP pertenecen al servicio
  compartido. Roles ADMIN, RECEPTIONIST, MANAGER y STAFF; ya no usar los seis
  roles iniciales ni las cuentas `@hotel.test`.
- El usuario confirmó las pruebas de la versión conectada a WEB-05 y autorizó
  el merge el 2026-09-07. WEB-06 se integra en `develop` sin conflictos desde
  `feat/web-06-auth-role-guards`; adaptación al servicio en commit `eeb22fe`.
  La integración no modifica automáticamente el estado de la issue #18.
- Sesión de ocho horas desde el login, sin cierre por inactividad; valor
  provisional pendiente de la política definitiva del equipo.
- La siguiente asignación, WEB-13 (#25), depende de WEB-03 (#15) y WEB-04 (#16).

## Continuidad de WEB-04

- Rama publicada: `feat/web-04-form-primitives`, creada desde `develop`
  actualizado (WEB-03 ya integrado). Commits:
  - `ea6b024` — Button
  - `08a86c3` — Input y Select
  - `be67d81` — Modal
  - `930d038` — DatePickerRange
- Componentes nuevos en `src/shared/components/`: `Button.tsx`/`Button.css`,
  `Input.tsx`, `Select.tsx`, `Field.css` (compartido por Input y Select),
  `Modal.tsx`/`Modal.css`, `DatePickerRange.tsx`/`DatePickerRange.css`.
- Todos consumen los tokens de `src/styles/tokens.css` sin modificarlo; no se
  tocó código heredado (`src/app/`, `src/components/`). Sin dependencias
  nuevas: `DatePickerRange` se construyó con React y TypeScript puro, sin
  librería de fechas ni de calendario.
- `Modal` exige `title` o `aria-label` en tiempo de compilación (tipo unión)
  para garantizar siempre un nombre accesible.
- `DatePickerRange` es controlado (`value`/`onChange`); compara fechas
  mediante una clave de calendario local (`YYYY-MM-DD`, derivada de getters
  locales, nunca de `toISOString()`) para evitar desplazamientos de zona
  horaria. Impide rangos invertidos y estadías de cero noches, y rechaza
  cualquier rango que atraviese una fecha marcada como no disponible.
- **Integrado a `develop`**: fusionado mediante PR #30
  (`feat/web-04-form-primitives` → `develop`), merge commit
  `2c28e43ba15a5a36c4ac5a562924d52fde610c58`.
- Verificación: `npm run typecheck`, `npm run lint` y `npm run build` sin
  errores; Prettier conforme en los 9 archivos nuevos. Hallazgo preexistente
  no relacionado: `format:check` global falla en 123 archivos fuera de
  alcance de WEB-04.

## Continuidad de WEB-07

- Issue #19, depende de WEB-01 (#13, ya integrado). Rama publicada:
  `feat/web-07-format-utils`, creada desde `develop` actualizado (incluye
  WEB-04 ya integrado). **Pendiente de integración**: la rama está publicada
  en origin pero todavía no tiene PR abierto ni se ha fusionado a `develop`.
- Commits (hash real, orden cronológico):
  - `b960882` — feat(web-07): add GTQ currency formatting utility
  - `bb32d7b` — feat(web-07): add Guatemala date and stay utilities
  - `e09d9be` — fix(web-07): add timezone-safe calendar date contract
  - `6c24a2a` — fix(web-07): normalize lot-b date fixtures
  - `826b595` — refactor(web-07): migrate payment amounts to cents
  - `9c0abd6` — refactor(web-07): migrate room prices to cents
  - `76b391c` — refactor(web-07): migrate booking amounts to cents
  - `bfdaf77` — refactor(web-07): migrate product prices to cents
  - `4242fe6` — test(web-07): add money contract regression coverage
- `formatCurrency(amountCents, currency = 'GTQ')` en
  `src/shared/utils/currency.ts` es la única función de formato de moneda;
  para GTQ produce `Q1,250.00` exacto (Intl inserta un espacio entre el
  símbolo y el monto en varios locales, incluido GTQ; se elimina
  centralmente ahí, no en cada consumidor).
- `src/shared/utils/date.ts` aporta `formatDateGT` (dd-mm-aaaa), `formatTimeGT`
  (HH:mm 24h), `formatStayRange` y `calculateNights`. `calculateNights` mide
  la distancia entre dos días calendario codificados con `Date.UTC` a partir
  de componentes locales (nunca por resta cruda de milisegundos), lo que evita
  errores de horario de verano/zona horaria; rechaza rango invertido y `Date`
  inválido en vez de devolver un número negativo o silenciar el error.
- Contrato de fecha civil vs. timestamp, en `src/shared/types/common.ts`:
  `toDomainCalendarDate`/`toDtoCalendarDate` (DTO `"YYYY-MM-DD"`, sin hora ni
  zona) frente a `toDomainDate`/`toDtoDate` (timestamp, ISO 8601 completo).
  `toDomainCalendarDate` nunca usa `new Date(value)` sobre el string completo:
  separa año/mes/día y construye con el constructor local de 3 argumentos,
  para no arrastrar el desplazamiento de día que produce un ISO de solo fecha
  interpretado como medianoche UTC. Valida fechas imposibles (`2026-02-30`,
  `2026-13-01`, etc.) comparando los componentes reconstruidos contra los
  solicitados.
- Migración a centavos enteros de los contratos legacy activos (los que
  consumen realmente `src/services/*Service.ts`), todos con `currency:
  Currency` explícita: `Payment.amount → amountCents`,
  `Room.pricePerNight → pricePerNightCents` (más `currency`, que no existía),
  `Booking.pricePerNight → pricePerNightCents` y
  `Booking.totalAmount → totalAmountCents`, `Product.price → priceCents`.
  Monedas de `mockData.ts` normalizadas de `'USD'` a `'GTQ'` en los cuatro
  contratos. Los tipos nuevos por carpeta (`payment/`, `charge/`, `rate/`,
  `booking/`, `product/`) ya usaban centavos desde antes de WEB-07 y no se
  modificaron; tampoco se consolidaron ambas generaciones de tipos, ni se creó
  ningún adapter temporal — decisión explícita para mantener el alcance del
  ticket acotado al contrato de formato, no a la arquitectura de entidades.
  La posible redundancia entre `Room.pricePerNightCents` y `Rate.priceCents`
  queda documentada como deuda/decisión arquitectónica posterior, sin
  resolver en WEB-07.
- `src/shared/mocks/lot-b.ts` normalizado al mismo contrato: fechas de
  calendario (`check_in`/`check_out`/`valid_from`/`valid_to`) a
  `"YYYY-MM-DD"`, timestamps (`created_at`/`updated_at`) a ISO 8601 completo;
  antes usaba `dd-mm-aaaa` en ambos casos, lo que producía `Invalid Date` o
  una fecha equivocada al pasar por `new Date(string)` (comprobado
  exhaustivamente: 36 de 68 valores únicos daban `Invalid Date`).
- `src/app/App.tsx` y `src/components/` conservan su propio formato de
  moneda/fecha (decimales, `$`, `toLocaleString` manual), sin tocar. Se
  verificó que están excluidos de `tsconfig.app.json`, que no son alcanzados
  desde `src/main.tsx` (único entry point real, vía `src/app/router.tsx`), y
  que no aparecen en el bundle de producción compilado (`dist/assets/*.js`).
- Cobertura: `scripts/test-currency.mjs` (11), `scripts/test-date.mjs` (35) y
  `scripts/test-money-contract.mjs` (13) — 59 pruebas, todas contra funciones
  y datos reales del repositorio (no fixtures inventados), sin dependencias
  nuevas; reutilizan el patrón de `scripts/test-auth.mjs` (esbuild + `node:
  test`).
- **AC5 (alineación con la app móvil) pendiente de validación**: `mobile/`
  solo contiene `README.md`, sin código ni especificación de formato de
  moneda/fecha/hora/locale. No se afirma que web y mobile coincidan; queda
  como acción futura verificar contra una fuente mobile real cuando exista.
- Estado final de WEB-07: integrado a `develop` vía PR #31 (fusionado
  2026-09-08T08:18:18Z). Ya no está pendiente.

## Continuidad de WEB-13

- Rama original `feat/web-13-presentation-catalog` (commit único `ab32a9a`,
  forkeada antes de WEB-03/04/06/07), integrada a `feat/fase-0-cierre` en el
  cierre de la Fase 0. `/components` muestra Card, Badge, EmptyState,
  LoadingState, ErrorState, DataTable con ordenación/paginación y los
  primitivos de WEB-04.
- Los tokens `--ui-*` de `presentation.css`/`components-catalog.css` ya no son
  provisionales: se reconciliaron contra la escala real de WEB-03 dentro de
  `tokens.css` (mismo archivo, sin `presentation-tokens.css` aparte).
- Ejecutar `npm run test:presentation` cuando se modifiquen estos componentes.
  Consultar `src/shared/README.md` para API y dependencias.
- Sigue pendiente la revisión visual en navegador (no había uno disponible
  durante la implementación). No cerrar #25 hasta esa revisión.

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
