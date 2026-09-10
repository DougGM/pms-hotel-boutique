# PMS Hotel Boutique

Frontend del sistema de gestión hotelera (PMS) para Hotel Aurora. Incluye una
web pública para reservas y una web privada para la operación y administración.

> **El trabajo vive en `develop`, no en `main`.** `main` solo tiene el commit
> inicial del repositorio; clonar y trabajar siempre sobre `develop` (o una
> rama creada a partir de ella).

## Objetivo

Ofrecer rutas base para el motor de reservas público y el panel operativo
privado, dejando una estructura lista para que el equipo implemente módulos.

## Base técnica

- React 18, TypeScript y Vite.
- npm como gestor de paquetes.
- React Router para la navegación web.
- Tailwind CSS y sistema de diseno centralizado en `src/styles/tokens.css`.
- Iconos de `lucide-react`.
- Alias `@/` para importar desde `src/`.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.

## Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd pms-hotel-boutique
git checkout develop
npm install
copy .env.example .env
npm run dev
```

En macOS o Linux, usar `cp .env.example .env`.

El repositorio normaliza los finales de línea a LF vía `.gitattributes`; no
cambiar `core.autocrlf` a mano localmente, no hace falta y puede generar
diffs espurios.

## Variables de entorno

Crear `.env` a partir de `.env.example`. Nunca incluir credenciales reales en
el repositorio.

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Estructura

`src/public/` contiene las vistas sin sesión y `src/private/` el layout con
menú principal para vistas internas. `src/modules/` organiza el dominio por
módulos con sus modelos, DTOs, mappers, adaptadores, servicios y componentes.
`src/shared/` contiene componentes, constantes, hooks, tipos y utilidades
reutilizables. `src/layouts/`, `src/services/`, `src/assets/` y `src/styles/`
alojan recursos transversales.

Rutas base disponibles: `/` (pública), `/auth/login` (inicio de sesión) y
`/pms/dashboard` (panel privado). `/login` y `/pms` siguen disponibles por
compatibilidad. Las rutas inexistentes muestran una página 404; bajo `/pms/`
se conserva el menú privado y se ofrece volver al panel operativo con sesión
activa. Sin sesión, toda ruta bajo `/pms` redirige al login.

`src/app/routes.ts` centraliza las URL: `routePaths` contiene las entradas
implementadas, los alias y los comodines que consume el router; `routes`
conserva el catálogo de rutas previstas por módulo y referencia las entradas
implementadas. Al conectar una vista nueva, definir su URL en ese archivo y
referenciarla desde `src/app/router.tsx`. Las vistas pendientes aún muestran
la 404 de su área, excepto las entradas del menú por rol, que muestran una
página provisional hasta integrar cada módulo.

Las pantallas que generó Bolt (`src/app/App.tsx`, `src/components/`) se
eliminaron al cerrar la Fase 0: no estaban conectadas a esta estructura. Su
hoja de estilos global, `src/index.css`, se conserva porque el layout actual
todavía depende de reglas base definidas ahí (ver
[src/ARCHITECTURE.md](src/ARCHITECTURE.md)).

## Comandos

```bash
npm install
npm run dev
npm run check
npm run test
npm run format
```

`npm run check` ejecuta formato, TypeScript, ESLint, compilación de
producción y `npm run test` (siete suites, 103 pruebas — ver
[src/ARCHITECTURE.md](src/ARCHITECTURE.md)). Cada suite también se puede
correr por separado: `npm run test:auth`, `test:currency`, `test:date`,
`test:money-contract`, `test:contract`, `test:services`, `test:presentation`.

## Acceso de demostración (WEB-06)

Abrir `/auth/login`. Todas las cuentas de prueba usan la contraseña pública
`AuroraDemo2026!`. No utilizar credenciales reales.

| Correo                       | Rol                        |
| ---------------------------- | -------------------------- |
| admin@hotelboutique.test     | Administración (ADMIN)     |
| recepcion@hotelboutique.test | Recepción (RECEPTIONIST)   |
| gerente@hotelboutique.test   | Gerencia (MANAGER)         |
| personal@hotelboutique.test  | Personal operativo (STAFF) |

La sesión dura ocho horas y se conserva al recargar. El menú depende del rol;
abrir directamente una sección ajena muestra acceso restringido. «Cerrar
sesión» elimina la persistencia y sincroniza el cierre con otras pestañas.

La autenticación es simulada y no protege datos de producción. Consume el
servicio compartido `services/authService.ts` y los tipos `SessionUser`/
`AuthSession`/`UserRole` de `shared/types/entities/session/` — un contrato
separado del `User` de `shared/types/entities/user/` (ese modela el puesto de
un empleado, no el rol de acceso al PMS; ver
[src/ARCHITECTURE.md](src/ARCHITECTURE.md)). Las cuentas antiguas
`@hotel.test` y su sesión local dejaron de utilizarse; iniciar sesión con una
cuenta de la tabla. Ver [el módulo auth](src/modules/auth/README.md) para
permisos, contrato y pruebas.

## Catálogo de interfaz — WEB-13

Abrir `/components` para revisar Card (outlined, raised, muted), Badge (cinco
tonos y dos tamaños), EmptyState, LoadingState, ErrorState, DataTable con
paginación y ordenación, y los primitivos de formulario de WEB-04 (Button,
Input, Select, Modal, DatePickerRange). El ejemplo de error ejecuta una
solicitud simulada fallida; «Reintentar» recupera los registros y permite
reproducir el fallo.

Los colores y medidas de esta entrega salen de `src/styles/tokens.css`, la
misma hoja de tokens que consume el resto del frontend.

`npm run test:presentation` verifica comportamiento y compatibilidad con las
tablas heredadas. Ver [la guía de componentes](src/shared/README.md).

## Seguimiento y contexto

- [PROJECT_STATUS.md](PROJECT_STATUS.md): estado, prioridades y decisiones.
- [src/ARCHITECTURE.md](src/ARCHITECTURE.md): contrato de carpetas y reglas.
- [src/styles/README.md](src/styles/README.md): tokens de diseno de WEB-03,
  extraidos desde WEB-08.
- [src/shared/README.md](src/shared/README.md): convenciones compartidas de
  moneda y fecha de WEB-07 (centavos enteros, GTQ, dd-mm-aaaa, HH:mm).
- [.codex/CONTEXT.md](.codex/CONTEXT.md): instrucciones de continuidad para agentes.
- [mobile/README.md](mobile/README.md): alcance de la futura aplicación nativa.
- [NEXT_CONTRIBUTOR.md](NEXT_CONTRIBUTOR.md): guía de trabajo para el siguiente compañero.
