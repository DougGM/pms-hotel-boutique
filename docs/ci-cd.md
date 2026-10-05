# Pipeline de CI/CD

## Resumen

El proyecto cuenta con dos canalizaciones complementarias:

- **GitHub Actions** (`.github/workflows/ci-cd.yml`): ejecuta validaciones
  automáticas en GitHub para pull requests y pushes destinados a integración o
  despliegue.
- **Jenkins** (`Jenkinsfile`): ejecuta el mismo ciclo en infraestructura
  On-Premise y permite archivar el build de producción desde el agente Jenkins.

Ambos pipelines instalan dependencias de forma reproducible con `npm ci`,
ejecutan las validaciones del proyecto y envían el análisis a Sonar. El build
de producción se ejecuta únicamente para ramas de entrega o tags.

## Arquitectura de las canalizaciones

### GitHub Actions

El workflow usa `ubuntu-latest`, Node.js 20 y caché de npm.

| Evento | Ejecución |
| --- | --- |
| Pull request hacia `develop` | `validate-and-test` |
| Push hacia `main` | `validate-and-test` y build de producción |
| Push de tag `v*.*.*` | `validate-and-test` y build de producción |

El job `validate-and-test` realiza checkout con `fetch-depth: 0`, instala las
dependencias, ejecuta `npm run check`, ejecuta `npm run test:coverage
--if-present` y lanza el análisis de SonarCloud.

El job `production-build-and-release` depende de `validate-and-test`, ejecuta
`npm run build` con `NODE_ENV=production` y publica el contenido de `dist/`
como el artefacto `production-dist`.

> Nota: la condición interna del job de producción también contempla
> `master`, pero el trigger `push` actual del workflow está configurado para
> `main` y tags. Para activar el pipeline automáticamente desde `master`, esa
> rama debe agregarse a `on.push.branches`.

### Jenkins On-Premise

El `Jenkinsfile` usa cualquier agente disponible (`agent any`) y solicita la
instalación administrada `NodeJS-20`.

Las etapas son:

1. **Checkout & Setup**: obtiene el código con `checkout scm` y ejecuta
   `npm ci`.
2. **Validation**: ejecuta `npm run check`.
3. **Tests & Coverage**: ejecuta `npm run test:coverage --if-present`.
4. **SonarQube Quality Gate**: ejecuta `sonar-scanner` con el token protegido
   por Jenkins Credentials Manager.
5. **Build Production**: se ejecuta en `main`, `master` o cuando la ejecución
   corresponde a un tag; compila y archiva `dist/**`.

El bloque `post { always { cleanWs() } }` elimina el workspace al finalizar
cualquier ejecución, tanto exitosa como fallida.

## Secretos de GitHub Repository Secrets

Configurar los siguientes secretos en **Repository Settings → Secrets and
variables → Actions → Repository secrets**:

| Secreto | Uso |
| --- | --- |
| `SONAR_TOKEN` | Token de autenticación para SonarCloud. |
| `SONAR_PROJECT_KEY` | Identificador del proyecto en SonarCloud. |
| `SONAR_ORGANIZATION` | Identificador de la organización en SonarCloud. |

El workflow los consume mediante `${{ secrets.NOMBRE_DEL_SECRETO }}`. Los
valores no deben escribirse en el repositorio, en archivos YAML ni en logs.
Después de guardarlos, validar que el token tenga permisos para analizar el
proyecto correspondiente.

## Credenciales de Jenkins

En **Manage Jenkins → Credentials → Global** crear una credencial de tipo
**Secret text** con:

- **ID**: `sonar-token`
- **Secret**: el token de SonarQube/SonarCloud

El `Jenkinsfile` expone temporalmente esa credencial como la variable de
entorno `SONAR_TOKEN` dentro de `withCredentials`. No se debe registrar el
valor ni sustituirlo por una clave literal en el archivo.

El agente Jenkins también debe tener disponible el ejecutable `sonar-scanner`
o una instalación configurada en Jenkins, además del tool NodeJS identificado
como `NodeJS-20`.

## Quality Gate y métricas

El análisis de Sonar revisa el código fuente y calcula las métricas que la
configuración del proyecto haya incluido en su Quality Gate:

- **Bugs**: problemas de lógica o comportamiento que pueden provocar fallos.
- **Code Smells**: patrones de diseño o mantenimiento que aumentan la deuda
  técnica, aunque no sean fallos funcionales inmediatos.
- **Vulnerabilidades OWASP**: problemas de seguridad detectados por las reglas
  de análisis estático aplicables al código.
- **Cobertura**: proporción de código ejecutado por las pruebas, importada
  desde el reporte LCOV `coverage/lcov.info`.

En Jenkins, el scanner usa explícitamente estos parámetros:

```text
-Dsonar.projectKey=pms-hotel-boutique-frontend
-Dsonar.sources=src
-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
```

El comando `npm run test:coverage --if-present` es opcional: si el script
`test:coverage` existe, debe generar `coverage/lcov.info` para que Sonar pueda
calcular cobertura. Si el script no existe o no genera el archivo, el análisis
no tendrá cobertura LCOV disponible.

El stage de Jenkins denominado `SonarQube Quality Gate` ejecuta el scanner y
publica el análisis en Sonar. La espera explícita mediante
`waitForQualityGate()` no está declarada actualmente en el `Jenkinsfile`; el
bloqueo de la ejecución depende de la configuración del scanner, del servidor
Sonar y de las reglas del proyecto.

## Empaquetado de producción

El empaquetado sigue este flujo:

1. El pipeline instala las dependencias con `npm ci`.
2. Ejecuta `npm run build` usando la configuración de producción.
3. Vite genera la salida compilada en `dist/`.
4. El pipeline conserva esa salida como artefacto:
   - GitHub Actions: artefacto `production-dist` mediante
     `actions/upload-artifact@v4`.
   - Jenkins: archivos `dist/**` mediante `archiveArtifacts`, con fingerprint
     habilitado.

El directorio `dist/` es el entregable estático para la siguiente etapa de
publicación o despliegue. No contiene secretos ni debe utilizarse para
almacenar credenciales.
