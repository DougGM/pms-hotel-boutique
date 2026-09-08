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
| 0 | Crear rama `feat/fase-0-cierre` desde `origin/develop`, línea base, esta bitácora | (este commit) | ✅ hecho |

## Decisiones tomadas

- Se usó `npm install` en vez de `npm ci` en el paso de línea base por un error `EPERM` de Windows al desinstalar un binario de `esbuild` bloqueado; no afecta el resultado (mismas versiones resueltas por `package-lock.json`).
- La rama `feat/fase-0-cierre` se creó **sin upstream** (`git branch --unset-upstream`) para que ningún `git push` sin argumentos pueda apuntar accidentalmente a `develop`. El push final se hará explícito: `git push -u origin feat/fase-0-cierre`.

## Pendientes y bloqueos

- Ninguno por ahora.
