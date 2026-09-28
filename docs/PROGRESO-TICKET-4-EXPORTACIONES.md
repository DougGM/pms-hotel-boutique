# Ticket 4 — Exportaciones de reportes

Fecha: 2026-09-28

Se agregó `src/shared/utils/exportCsv.ts` para descargar CSV UTF-8 desde el
frontend. Recepción, Room Service, Conserjería, Dashboard, Reportes, Caja y
Auditoría exportan datos del estado o servicios actuales, respetan los
filtros activos donde aplica y muestran un aviso cuando no hay filas.
