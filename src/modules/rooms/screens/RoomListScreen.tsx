import { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { roomService } from '@/services/roomService';
import type { Room } from '@/shared/types/entities/room';

type ScreenState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; rooms: Room[] };

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

export function RoomListScreen() {
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });

  const loadRooms = useCallback(async () => {
    setScreen({ status: 'loading' });
    try {
      const rooms = await roomService.getRooms();
      setScreen({ status: 'ready', rooms });
    } catch (cause) {
      setScreen({ status: 'error', message: getErrorMessage(cause) });
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  return (
    <section className="content">
      <h1>Habitaciones</h1>

      {screen.status === 'loading' && <LoadingState label="Cargando habitaciones..." />}

      {screen.status === 'error' && (
        <ErrorState
          title="No pudimos cargar las habitaciones"
          description={screen.message}
          onRetry={loadRooms}
        />
      )}

      {screen.status === 'ready' && screen.rooms.length === 0 && (
        <EmptyState
          title="Sin habitaciones"
          description="No hay habitaciones registradas todavía."
        />
      )}

      {screen.status === 'ready' && screen.rooms.length > 0 && (
        <ul>
          {screen.rooms.map((room) => (
            <li key={room.id}>{room.roomNumber}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
