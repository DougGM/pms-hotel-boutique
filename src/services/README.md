# Capa de servicios

Los componentes consumen servicios, no datos mock ni DTOs directamente. Cada
servicio simula latencia, puede lanzar un error controlado y transforma los
DTOs mediante el mapper correspondiente antes de devolver modelos de dominio.

```tsx
import { useEffect, useState } from 'react';
import { roomService } from '@/services/roomService';
import type { Room } from '@/shared/types/entities';

export function RoomsView() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    roomService
      .getRooms()
      .then((data) => {
        if (active) setRooms(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Error inesperado');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (error) return <ErrorState message={error} />;
  return <RoomList rooms={rooms} />;
}
```

Servicios disponibles: `authService`, `roomService`, `bookingService`,
`guestService`, `paymentService`, `catalogService`, `guestAccountService`,
`cashService`, `personnelService`, `inventoryService` y `auditService`. Las
operaciones de creación reciben los DTOs de entrada definidos en
`src/shared/types/entities`; sus respuestas siempre son modelos de dominio.
Todos leen de `src/data/db.ts`, la única "base de datos" simulada del
proyecto — ver `src/ARCHITECTURE.md`.

## Forzar errores mock

1. En código: `mockUtils.setForceError(true)` y, al terminar la prueba,
   `mockUtils.setForceError(false)`.
2. En la URL: agrega `?mockError=true` a la ruta actual.
3. En el navegador: ejecuta
   `localStorage.setItem('PMS_FORCE_MOCK_ERROR', 'true')` y elimínalo con
   `localStorage.removeItem('PMS_FORCE_MOCK_ERROR')`.

Todas las operaciones esperan entre 300 y 600 ms por defecto. Para pruebas
unitarias se puede usar `simulateLatency(0, 0)` directamente.

## Integración con WEB-06

`authService.login(email, password, signal?)` conserva su API y admite cancelar
una solicitud pendiente. Valida ambas credenciales contra `sessionAccountsDB`
(`src/data/db.ts`), una por cada rol del contrato compartido. Las cuentas y
permisos se documentan en `src/modules/auth/README.md`.

`getCurrentSession(signal?)` devuelve la sesión completa con fechas de dominio;
`getCurrentUser()` delega en ella. La persistencia única usa `PMS_AUTH_SESSION`.
La restauración rechaza datos corruptos/vencidos y reconstruye el usuario desde
los fixtures. La sesión dura ocho horas desde el inicio.

`logout()` limpia inmediatamente la persistencia y el token HTTP incluso cuando
falla la solicitud simulada posterior. `clearSession()` expone la limpieza local.
Las respuestas de login canceladas u obsoletas no reabren la sesión. Se retiró
la clave aislada `hotel-aurora.auth.v1`; las cuentas anteriores deben iniciar
sesión otra vez. Todo es simulado y no constituye autenticación de producción.
