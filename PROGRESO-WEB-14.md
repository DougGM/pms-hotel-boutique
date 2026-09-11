# Progreso - WEB-14 servicios faltantes

**Rama:** `web-14-servicios-faltantes`
**Fecha:** 2026-09-11

## Alcance implementado

- `roomService.createRoom(data)`: crea una habitación en `roomsDB`, asigna
  `status: 'available'` y `housekeeping_status: 'dirty'` por defecto cuando
  no vienen en el DTO, y devuelve `Room` de dominio.
- `roomService.updateRoom(id, data)`: actualiza una habitación existente,
  refresca `updated_at` y devuelve `Room`.
- `roomService.getRoomTypes()`: devuelve `RoomType[]` desde `roomTypesDB`.
- `bookingService.checkIn(bookingId)`: cambia `confirmed -> checkedIn` usando
  `BOOKING_STATUS_TRANSITIONS`.
- `bookingService.checkOut(bookingId)`: cambia `checkedIn -> checkedOut`
  usando `BOOKING_STATUS_TRANSITIONS`.
- `bookingService.assignRoom(bookingId, roomId)`: asigna `room_id` solo si la
  habitación pasa por `isRoomAssignable()`.
- `guestAccountService.createCharge(data)`: crea un `Charge` `posted`, calcula
  `amount_cents`, lo inserta en `chargesDB` y suma el importe al
  `balance_cents` guardado de la cuenta abierta.

## Contrato agregado

- `CreateRoomDto` y `UpdateRoomDto` en `room.dto.ts`.
- `CreateChargeDto` en `charge.dto.ts`.
- Exportaciones actualizadas en barrels de `room`, `charge` y
  `shared/types/entities`.

## Documentación actualizada

- `src/services/README.md`: sección WEB-14 con métodos y reglas.
- `docs/CONTRATO-DATOS.md`: fecha, DTOs de entrada y efectos de servicio.
- `docs/PROJECT_STATUS.md`: estado de servicios/datasets y conteo de pruebas.
- `src/ARCHITECTURE.md` y `README.md`: conteo actual de suites/pruebas.

## Revisión de Markdown

Se revisaron todos los `.md` con `rg --files -g "*.md"` y búsqueda de términos
obsoletos (`WEB-14`, `test-services`, `103 pruebas`, `240 pruebas`,
`shared/mocks/lot-b`, `Sin datos mock ni servicio`). Los documentos vivos se
actualizaron. Las referencias restantes están en bitácoras históricas de PR o
fase (`PROGRESO-*`, `docs/revision-pr-32.md`, `docs/cierre-fase-0.md`,
`docs/PROGRESO-FASE-0.md`) y se mantienen sin cambios para conservar el registro
del estado de ese momento.

## Verificación

- `npm.cmd run typecheck`
- `npm.cmd run test:services` (16 pruebas)
- `npm.cmd run check` (formato, TypeScript, ESLint, build y 238 pruebas)
