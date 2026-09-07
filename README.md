# PMS Hotel Boutique

Frontend del sistema de gestión hotelera (PMS) para Hotel Aurora. Incluye una
web pública para reservas y una web privada para la operación y administración.

## Objetivo

Ofrecer rutas base para el motor de reservas público y el panel operativo
privado, dejando una estructura lista para que el equipo implemente módulos.

## Base técnica

- React 18, TypeScript y Vite.
- npm como gestor de paquetes.
- React Router para la navegación web.
- Tailwind CSS y tokens visuales base en `src/styles/tokens.css`.
- Iconos de `lucide-react`.
- Alias `@/` para importar desde `src/`.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.

## Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd pms-hotel-boutique
npm install
copy .env.example .env
npm run dev
```

En macOS o Linux, usar `cp .env.example .env`.

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
se conserva el menú privado y se ofrece volver al panel operativo.

`src/app/routes.ts` centraliza las URL: `routePaths` contiene las entradas
implementadas, los alias y los comodines que consume el router; `routes`
conserva el catálogo de rutas previstas por módulo y referencia las entradas
implementadas. Al conectar una vista nueva, definir su URL en ese archivo y
referenciarla desde `src/app/router.tsx`. Las vistas pendientes aún muestran
la 404 de su área.

El código heredado de Bolt se conserva temporalmente fuera de los chequeos
mientras se migra a esta estructura.

## Comandos

```bash
npm install
npm run dev
npm run check
npm run format
```

`npm run check` ejecuta formato, TypeScript, ESLint y compilación de producción.

## Seguimiento y contexto

- [PROJECT_STATUS.md](PROJECT_STATUS.md): estado, prioridades y decisiones.
- [src/ARCHITECTURE.md](src/ARCHITECTURE.md): contrato de carpetas y reglas.
- [.codex/CONTEXT.md](.codex/CONTEXT.md): instrucciones de continuidad para agentes.
- [mobile/README.md](mobile/README.md): alcance de la futura aplicación nativa.
- [NEXT_CONTRIBUTOR.md](NEXT_CONTRIBUTOR.md): guía de trabajo para el siguiente compañero.
