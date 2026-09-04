# Módulos de Dominio

Cada módulo contiene seis capas: `models`, `dtos`, `mappers`, `adapters`,
`services` y `components`. Los `mappers` concentran la conversión entre DTOs,
respuestas externas y modelos de dominio. Las carpetas ya están creadas para
los dominios del taller:

`auth`, `users`, `roles`, `guests`, `rooms`, `reservations`, `stays`, `billing`,
`payments`, `rates`, `promotions`, `amenities`, `housekeeping`, `room-service`,
`concierge`, `inventory`, `cash`, `reports`, `audit` y `notifications`.

No colocar lógica de negocio nueva en `src/app/App.tsx`. Extraerla hacia el
módulo correspondiente junto con su modelo y contrato de datos.

Las capas de navegación se separan de los módulos: `src/public/page.tsx` es el
acceso público y `src/private/page.tsx` es el layout de la zona autenticada.
