# Progreso Ronda 1 - Lote B

## WEB-20 / Issue #46 - SearchScreen

Estado: implementado en rama `booking-engine`.

Cambios realizados:

- `SearchScreen` dejo de ser placeholder y ahora permite seleccionar rango de fechas con `DatePickerRange`.
- La busqueda carga datos mediante `roomService.getRoomTypes()`, `roomService.getRooms()` y `bookingService.getBookings()`.
- La disponibilidad se calcula por tipo de habitacion usando habitaciones asignables y reservas que se solapan con el rango elegido.
- Cada resultado enlaza a `/rooms/:roomTypeId` preservando `checkIn` y `checkOut` en query string para WEB-21.
- La pantalla cubre estado inicial, carga, error con reintento y busqueda sin resultados.
- Se agrego `roomService.getRoomTypes()` porque la issue lo requiere y esta rama no lo exponia aun.

Verificacion:

- `npm run typecheck`: OK.
- `npm run lint`: OK.
- `npm run build`: OK.
- `npm run test`: OK.
- `npm run check`: bloqueado en `format:check` por archivos preexistentes fuera de esta issue
  (`src/index.css`, `NEXT_CONTRIBUTOR.md`, archivos de `shared/types`, configs, etc.).
