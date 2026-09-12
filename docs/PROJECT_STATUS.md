# Seguimiento del Proyecto

## Estado actual

**Fase 0 del frontend web cerrada** (issues #9 y #12), vía Pull Request desde
`feat/fase-0-cierre` hacia `develop`. El detalle fase por fase —incluidas las
decisiones de diseño no triviales— vive en `PROGRESO-FASE-0.md`; este
documento resume el estado resultante, no el proceso para llegar a él.

- Base visual heredada del proyecto Bolt `sb1-8sal4vhj` (`src/index.css`,
  paleta). Las pantallas que Bolt generó (`src/app/App.tsx`,
  `src/components/`) se eliminaron: no estaban conectadas a la aplicación
  real (verificado antes de borrar — ver `PROGRESO-FASE-0.md`, FASE 6).
- Zonas web: `src/public/` (sin sesión, incluye el catálogo `/components`),
  `src/private/` (autenticado), `src/modules/` (auth, ui-catalog),
  `src/shared/` (componentes, tipos, tokens, mocks).
- Rutas tipadas desde `src/app/routes.ts`, consumidas por
  `src/app/router.tsx`. 404 pública y privada; las rutas desconocidas bajo
  `/pms/` conservan el menú operativo.
- Sistema de diseño centralizado en `src/styles/tokens.css` — única fuente de
  color, tipografía, espaciado y radios, incluidos los tokens de WEB-13
  (`--ui-*`, reconciliados contra esta misma escala).
- Primitivos de formulario (`Button`, `Input`, `Select`, `Modal`,
  `DatePickerRange`) y de presentación (`Card`, `Badge`, `EmptyState`,
  `LoadingState`, `ErrorState`, `DataTable`/`TableFrame`, `Pagination`) en
  `src/shared/components/`, todos visibles y probados en `/components`.
- Sesión de personal: login simulado, guardas de ruta por permiso, menú por
  rol (ADMIN/RECEPTIONIST/MANAGER/STAFF), persistencia de ocho horas.
- Contrato de datos: **una sola definición por entidad**
  (`src/shared/types/entities/<entidad>/`, DTO snake_case → Mapper → Model
  camelCase). Moneda en quetzal, montos como entero en centavos,
  `formatCurrency`/`formatDateGT`/`formatTimeGT` como únicas funciones de
  formato.
- Servicios (`bookingService`, `roomService`, `guestService`,
  `paymentService`, `catalogService`, `guestAccountService`, `cashService`,
  `personnelService`, `inventoryService`, `auditService`, `authService`) async,
  con latencia simulada y forzado de error; todos leen de `src/data/db.ts`,
  salvo `authService`, que además persiste la sesión en `localStorage`.
- WEB-14 implementado: `roomService.createRoom/updateRoom/getRoomTypes`,
  `bookingService.checkIn/checkOut/assignRoom` y
  `guestAccountService.createCharge`.
- Base de la app React Native en el repositorio separado `pms-hotel-mobile`
  (empleados: autenticación, tareas, habitaciones, solicitudes, pedidos).

## Pendiente, fuera del cierre de la Fase 0

- **`src/index.css` sin separar**: mezcla estilos base en uso real con
  estilos exclusivos del árbol de Bolt ya eliminado. Requiere trazar
  selector por selector antes de poder podar los alias `--*-legacy-*` de
  `tokens.css` que ya no tendrían consumidor. Candidato a ticket aparte.
- **WEB-11 (#23) y WEB-12 (#24)** (datos mock de Caja/Lote C y
  Catálogos-Inventario/Lote D): sin código todavía.
- Migrar las vistas de recepción/reservas/housekeeping/room-service/huésped/
  administración de la UI de Bolt (ya eliminada) a módulos de dominio reales:
  no hay nada que "migrar" desde código porque ese código no existía
  conectado; son pantallas por construir desde cero sobre la base que deja
  la Fase 0.

## Pendiente por módulo

| Módulo                                                                  | Estado                           | Próximo paso                                                  |
| ----------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Auth                                                                    | Integrada y probada (14 pruebas) | Construir las pantallas que la consumen                       |
| Base compartida (rutas, tema, primitivos, contrato de datos, servicios) | Cerrada (Fase 0)                 | —                                                             |
| Reservaciones y recepción                                               | Sin pantallas                    | Construir sobre `bookingService`/`roomService`/`guestService` |
| Caja (WEB-11)                                                           | Dataset y servicios base listos  | Construir pantallas                                           |
| Catálogos e inventario (WEB-12)                                         | Dataset y servicios base listos  | Construir pantallas                                           |
| Housekeeping / Room service / Conserjería / Huésped / Administración    | Sin pantallas                    | Implementar según prioridad del equipo                        |

## Decisiones

- Se conserva Vite en vez de migrar a Next.js.
- No introducir bibliotecas visuales adicionales sin una necesidad concreta.
- Consultar `src/ARCHITECTURE.md` antes de crear archivos web y
  `mobile/README.md` antes de crear archivos móviles.
- Copiar `.env.example` a `.env` para desarrollo local y ejecutar
  `npm run check` antes de publicar cambios.

## Verificación más reciente

`npm run check` (`format:check && typecheck && lint && build && test`) es la
verificación requerida antes de publicar cambios. La suite actual tiene once
scripts y 238 pruebas; `test-services` cubre 16 casos, incluidos los siete
métodos de WEB-14. Revisión visual histórica en navegador de `/`,
`/auth/login`, `/pms` (con y sin sesión), 404 pública/privada y `/components`
tras eliminar la UI de Bolt — igual que antes del borrado.
