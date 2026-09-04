# PMS Hotel Boutique

Frontend del sistema de gestión hotelera (PMS) para Hotel Aurora. El proyecto
parte de la interfaz funcional creada en Bolt y se está reorganizando según la
arquitectura definida en `Taller de Arquitectura y Desglose Frontend.pdf`.

## Objetivo

Ofrecer tres experiencias conectadas: portal público para reservar, área privada
del huésped y consola operativa para personal y administración del hotel.

## Base técnica

- React 18, TypeScript y Vite.
- CSS original del proyecto Bolt en `src/index.css`.
- Iconos de `lucide-react`.
- Alias `@/` para importar desde `src/`.

## Organización

`src/public/` contiene las vistas sin sesión y `src/private/` el layout con
menú principal para vistas internas. `src/modules/` organiza el dominio por
módulos con sus modelos, DTOs, mappers, adaptadores, servicios y componentes.
`src/shared/components/` queda reservado para componentes reutilizables.

La interfaz heredada del ZIP está inicialmente conservada en `src/app/App.tsx`
y `src/components/`. La migración será gradual para no perder estilos ni
funcionalidad mientras se trasladan las vistas a sus módulos definitivos.

## Comandos

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Seguimiento y contexto

- [PROJECT_STATUS.md](PROJECT_STATUS.md): estado, prioridades y decisiones.
- [src/ARCHITECTURE.md](src/ARCHITECTURE.md): contrato de carpetas y reglas.
- [.codex/CONTEXT.md](.codex/CONTEXT.md): instrucciones de continuidad para agentes.
- [mobile/README.md](mobile/README.md): alcance de la futura aplicación nativa.
- [NEXT_CONTRIBUTOR.md](NEXT_CONTRIBUTOR.md): guía de trabajo para el siguiente compañero.
