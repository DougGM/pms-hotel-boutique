# Progreso del cierre de la Fase 0

**Rama:** feat/fase-0-cierre
**Base:** origin/develop @ `a1c07cd` (Merge pull request #31 from DougGM/feat/web-07-format-utils)
**Iniciado:** 2026-09-08

## Revalidación previa (FASE PREVIA)

| # | Punto del plan original | Estado encontrado | Veredicto |
|---|---|---|---|
| 1 | Contrato de entidades duplicado (`booking`/`guest`/`room`/`payment`/`user` planos vs. oficiales) | Sin cambios: `entities/index.ts` sigue exportando los archivos planos. | CONFIRMADO |
| 2 | Moneda `'USD'` y montos sin centavos en `bookingService.ts`/`mockData.ts` | Corregido por PR #31 (WEB-07, fusionado 2026-09-08T08:18:18Z): `currency: 'GTQ'`, campos `*Cents` con valores ×100 correctos. Pero aplicado sobre el contrato **duplicado** (camelCase), no el oficial (snake_case). `Currency` en `common.ts` seguía siendo unión de 4 monedas. | CAMBIÓ |
| 3a | `origin/feat/web-07-format-utils` sin fusionar | Fusionada (PR #31). Issue #19 CLOSED. Trae `formatCurrency`/`formatDateGT`/`formatTimeGT` y 3 suites de prueba (`test-currency.mjs`, `test-date.mjs`, `test-money-contract.mjs`), no enganchadas a `package.json`. | CAMBIÓ |
| 3b | `origin/feat/web-13-presentation-catalog` sin fusionar | Sin cambios: 1 commit (`ab32a9a`), sin PR, issue #25 OPEN. | CONFIRMADO |
| 4 | Código muerto de Bolt (`src/app/App.tsx`, `src/components/*`) sin referencias | Sin cambios: 5.359 líneas, sin importar desde `main.tsx`/`router.tsx`. `tokens.css` con 312 alias legacy. | CONFIRMADO |

**Ajustes acordados con el usuario tras esta revalidación** (sustituyen lo que decía el plan original en esos puntos; todo lo demás del plan queda igual):

- **FASE 2:** se elimina el paso de fusionar `feat/web-07-format-utils` (ya heredado desde `develop`). Solo se integra `feat/web-13-presentation-catalog`. Se verifica que `test-currency.mjs`, `test-date.mjs` y `test-money-contract.mjs` sigan pasando después del merge.
- **FASE 3 + FASE 4 fusionadas** en una sola fase y un solo commit: sobrevive el contrato oficial de WEB-09 (snake_case, `_cents`); los valores de `mockData.ts` (ya en centavos correctos) se trasladan **sin volver a multiplicar por 100**; se cierra `Currency` a literal `'GTQ'`; se migran los servicios; se elimina el parche `f5ad36c`; se adapta (no se reescribe) `test-money-contract.mjs` a los nombres snake_case. Antes de ese commit se presenta una tabla campo/valor-antes/valor-después para verificación humana.
- **FASE 7:** no se duplican `test-currency.mjs`/`test-date.mjs`/`test-money-contract.mjs`. Se enganchan a `npm run test` y `npm run check`. Solo se agregan `test-contract.mjs` y `test-services.mjs`.
- `format:check` está en **137 archivos** al momento de crear la rama (no 131 ni 136 exactamente; ver estado inicial).

## Estado inicial (en `feat/fase-0-cierre`, recién creada desde `origin/develop`)

| Comando | Resultado |
|---|---|
| `npm install` (falló `npm ci` por `EPERM` en `node_modules/@esbuild`, posiblemente locked por otro proceso; se usó `npm install` como fallback) | ✅ 233 paquetes añadidos, 64 cambiados |
| `npm run lint` | ✅ limpio |
| `npm run typecheck` | ✅ limpio |
| `npm run build` | ✅ compila (`dist/` generado) |
| `npm run format:check` | ❌ 137 archivos con problemas de formato |
| `node scripts/test-auth.mjs` | ✅ 14/14 |
| `node scripts/test-currency.mjs` | ✅ 11/11 |
| `node scripts/test-date.mjs` | ✅ 35/35 |
| `node scripts/test-money-contract.mjs` | ✅ 13/13 |

## Bitácora

| Fase | Descripción | Commit | Estado |
|---|---|---|---|
| 0 | Crear rama `feat/fase-0-cierre` desde `origin/develop`, línea base, esta bitácora | `74919dd` | ✅ hecho |
| 1 | Verificación previa al borrado (aislamiento del código de Bolt) | — (sin commit, solo lectura) | ⚠️ parcial — desbloqueado por el usuario: Opción A (ver más abajo) |
| 2 | Integrar `feat/web-13-presentation-catalog` (WEB-07 ya venía heredado en `develop`) | `af96f51` | ✅ hecho |

### FASE 1 — detalle del bloqueo

**TSX: aislado.** Ningún archivo vivo (`src/main.tsx`, `src/app/router.tsx`, `src/app/routes.ts`,
`src/public/*`, `src/private/*`, `src/modules/*`, `src/shared/*`) importa `src/app/App.tsx` ni
`src/components/{admin,guest,reception,roomservice}`. Verificado por grep transitivo desde
`index.html`. Seguro de eliminar en la FASE 6.

**CSS: NO aislado.** `src/index.css` (7.937 líneas, 1.243 selectores) se importa desde
`src/main.tsx:5` — es decir, está vivo. La mayoría de sus selectores (`.adm-*`, etc.) parecen
pertenecer solo al árbol muerto de Bolt, pero **al inicio del archivo hay reglas base
genuinamente en uso por la app real**: `body` (línea 20, `min-width: var(--size-legacy-1100)`),
`.app-shell` (línea 34), `.public-page-shell`/`.public-page-card` (líneas 39-60, usadas por
`PublicPage.tsx` y `StaffLoginPage.tsx`), `.eyebrow`/`.workspace-label` (línea ~107, usadas por
`StaffLoginPage.tsx`, `PublicPage.tsx`, `PrivateLayout`), `.content`/`.welcome-row` (línea 377,
usadas por `OperationsHomePage.tsx`, `RequirePermission.tsx`), `.button`/`.button.primary`/
`.button.secondary` (línea 407, usadas en todos lados). Esas reglas, activas hoy, referencian
directamente variables `--*-legacy-*`: `--size-legacy-1100`, `--size-legacy-38`,
`--color-legacy-a89c91`, `--color-legacy-91847a`, `--color-legacy-b88d5030`,
`--color-legacy-c9a36d`, `--color-legacy-e4dcd4`, `--color-legacy-efe5d8`, `--size-legacy-31/36/42/1600/26/5`,
entre otras.

Esto contradice la premisa de la auditoría original ("los alias legacy solo los consume la UI
muerta") y activa la cláusula de la propia FASE 1: **"si un primitivo vivo consume una variable
legacy: DETENTE y repórtalo. No borres."** No hay forma mecánica y segura de separar, dentro de
`index.css`, qué variables legacy son puramente del árbol muerto y cuáles sostienen el layout
básico que sí se renderiza hoy (login, landing pública, shell operativo) sin trazar selector por
selector — es un trabajo de análisis/repartición de `index.css` en sí mismo, no una simple poda.

**Decisión:** me detuve aquí, sin tocar código, y reporté al usuario en vez de improvisar una
forma de separar `index.css`.

**Resolución del usuario (Opción A):** FASE 6 queda reducida a eliminar `src/app/App.tsx` y
`src/components/{admin,guest,reception,roomservice}`, retirar `@supabase/supabase-js` si sigue
sin usarse, y resolver `httpClient.ts` vs. `http-client.ts`. **No se toca `tokens.css` ni
`index.css` en este cierre de Fase 0** — ni un alias `--*-legacy-*` se borra. La separación de
`index.css` en estilos base vivos vs. estilos del árbol muerto queda fuera de este cierre; el
usuario la convertirá en un ticket aparte (se deja constancia en la FASE 8 y en el PR).

### FASE 2 — integración de WEB-13

Se fusionó `origin/feat/web-13-presentation-catalog` (commit único `ab32a9a`, forkeada antes de
que WEB-03/04/06/07 llegaran a `develop`). Conflictos en `.codex/CONTEXT.md`, `PROJECT_STATUS.md`,
`README.md`, `package.json`, `src/ARCHITECTURE.md`, `src/app/router.tsx`, `src/shared/README.md`
resueltos conservando ambos lados. `src/app/routes.ts`, `src/app/routes.ts`, `AdminContent.tsx`,
`ReceptionModals.tsx` y `tokens.css` fusionaron sin conflicto.

Trabajo adicional durante la integración (parte del mandato original de la FASE 2, no eliminado
por el usuario):

- **Tokens reconciliados**: `presentation-tokens.css` (segundo sistema de tokens `--ui-*`
  provisional, con ~46 valores hardcodeados propios) se eliminó. Sus variables ahora se definen
  dentro de `tokens.css`, apuntando a los tokens reales de WEB-03 donde existe equivalente
  (`--space-*`, `--font-size-*`, `--radius-*`, `--color-*`); las tintas de fondo de Badge/alerta
  (`--ui-*-bg`) se derivan con `color-mix()` desde los colores semánticos existentes en vez de
  hex nuevos; los pocos valores sin equivalente (anchos de layout, alto de control, foco, motion)
  se definen una sola vez ahí. `components-catalog.css` y `presentation.css` no se tocaron —
  siguen usando los mismos nombres `--ui-*`, ahora resueltos contra la escala real.
- **Primitivos de WEB-04 incorporados al catálogo**: la sección "05 / Componentes de formulario"
  mostraba solo insignias "· pendiente"; se reemplazó por ejemplos reales de `Button`, `Input`,
  `Select`, `Modal` y `DatePickerRange` (`src/public/pages/ComponentsCatalogPage.tsx`).
  `tests/presentation.test.jsx` se ajustó (la aserción que buscaba el texto retirado
  "Pendientes de WEB-04") sin tocar las 8 pruebas originales.

Verificado tras el merge: `npm run lint`, `npm run typecheck`, `npm run build`,
`node scripts/test-auth.mjs` (14/14), `scripts/test-currency.mjs` (11/11),
`scripts/test-date.mjs` (35/35), `scripts/test-money-contract.mjs` (13/13),
`scripts/test-presentation.mjs` (8/8) — todos en verde.

## Decisiones tomadas

- Se usó `npm install` en vez de `npm ci` en el paso de línea base por un error `EPERM` de Windows al desinstalar un binario de `esbuild` bloqueado; no afecta el resultado (mismas versiones resueltas por `package-lock.json`).
- La rama `feat/fase-0-cierre` se creó **sin upstream** (`git branch --unset-upstream`) para que ningún `git push` sin argumentos pueda apuntar accidentalmente a `develop`. El push final se hará explícito: `git push -u origin feat/fase-0-cierre`.

## Pendientes y bloqueos

- **Ya no es un bloqueo activo** (resuelto por el usuario, Opción A): `src/index.css` sigue sin
  separarse — mezcla en un solo archivo de 7.937 líneas estilos base realmente en uso (`body`,
  `.app-shell`, `.public-page-shell`, `.public-page-card`, `.eyebrow`, `.content`,
  `.button`/`.primary`/`.secondary`, `.workspace-label`, `.welcome-row`) con estilos exclusivos
  del árbol muerto de Bolt (`.adm-*` y probablemente `.rec-*`/`.guest-*`/`.rs-*`), y varias de
  esas reglas en uso real dependen de variables `--*-legacy-*` de `tokens.css`. Por decisión del
  usuario, **queda fuera de este cierre de Fase 0** — ni `tokens.css` ni `index.css` se tocan en
  la FASE 6 reducida. El usuario abrirá un ticket aparte para separar `index.css`.
