# Módulos de Dominio

Cada módulo contiene cinco capas: `models`, `dtos`, `adapters`, `services` y
`components`. Las carpetas ya están creadas para los dominios del taller:

`auth`, `users`, `roles`, `guests`, `rooms`, `reservations`, `stays`, `billing`,
`payments`, `rates`, `promotions`, `amenities`, `housekeeping`, `room-service`,
`concierge`, `inventory`, `cash`, `reports`, `audit` y `notifications`.

No colocar lógica de negocio nueva en `src/app/App.tsx`. Extraerla hacia el
módulo correspondiente junto con su modelo y contrato de datos.
