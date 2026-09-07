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
se conserva el menú privado y se ofrece volver al panel operativo con sesión
activa. Sin sesión, toda ruta bajo `/pms` redirige al login.

`src/app/routes.ts` centraliza las URL: `routePaths` contiene las entradas
implementadas, los alias y los comodines que consume el router; `routes`
conserva el catálogo de rutas previstas por módulo y referencia las entradas
implementadas. Al conectar una vista nueva, definir su URL en ese archivo y
referenciarla desde `src/app/router.tsx`. Las vistas pendientes aún muestran
la 404 de su área, excepto las entradas del menú por rol, que muestran una
página provisional hasta integrar cada módulo.

El código heredado de Bolt se conserva temporalmente fuera de los chequeos
mientras se migra a esta estructura.

## Comandos

```bash
npm install
npm run dev
npm run check
npm run test:auth
npm run format
```

`npm run check` ejecuta formato, TypeScript, ESLint y compilación de producción.

## Acceso de demostración (WEB-06)

Abrir `/auth/login`. Todas las cuentas de prueba usan la contraseña pública
`AuroraDemo2026!`. No utilizar credenciales reales.

| Correo                 | Rol            |
| ---------------------- | -------------- |
| admin@hotel.test       | Administración |
| recepcion@hotel.test   | Recepción      |
| limpieza@hotel.test    | Limpieza       |
| roomservice@hotel.test | Room Service   |
| conserjeria@hotel.test | Conserjería    |
| caja@hotel.test        | Caja           |

La sesión dura ocho horas y se conserva al recargar. El menú depende del rol;
abrir directamente una sección ajena muestra acceso restringido. «Cerrar
sesión» elimina la persistencia y sincroniza el cierre con otras pestañas.

La autenticación es simulada y no protege datos de producción. WEB-05 sigue
pendiente: el adaptador local deberá conectarse a sus servicios, y los roles
y permisos deberán coordinarse con WEB-09/WEB-12 antes de integrar WEB-06.
Ver [el módulo auth](src/modules/auth/README.md) para contrato y pruebas.

## Seguimiento y contexto

- [PROJECT_STATUS.md](PROJECT_STATUS.md): estado, prioridades y decisiones.
- [src/ARCHITECTURE.md](src/ARCHITECTURE.md): contrato de carpetas y reglas.
- [src/styles/README.md](src/styles/README.md): tokens de diseno de WEB-03,
  extraidos desde WEB-08.
- [.codex/CONTEXT.md](.codex/CONTEXT.md): instrucciones de continuidad para agentes.
- [mobile/README.md](mobile/README.md): alcance de la futura aplicación nativa.
- [NEXT_CONTRIBUTOR.md](NEXT_CONTRIBUTOR.md): guía de trabajo para el siguiente compañero.
