import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { Badge, type BadgeTone } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { roomService } from '@/services/roomService';
import type { Room, RoomHousekeepingStatus, RoomStatus } from '@/shared/types/entities/room';
import './rooms.css';

type ScreenState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; rooms: Room[] };

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

const ROOM_STATUS_TONES: Record<RoomStatus, BadgeTone> = {
  available: 'success',
  occupied: 'info',
  maintenance: 'warning',
  outOfService: 'danger',
};

const ROOM_HOUSEKEEPING_TONES: Record<RoomHousekeepingStatus, BadgeTone> = {
  dirty: 'warning',
  cleaning: 'info',
  clean: 'success',
  inspected: 'success',
};

const baseColumns: DataTableColumn<Room>[] = [
  {
    id: 'roomNumber',
    header: 'Habitación',
    cell: (room) => room.roomNumber,
    sortValue: (room) => room.roomNumber,
  },
  {
    id: 'roomTypeId',
    header: 'Tipo',
    cell: (room) => room.roomTypeId,
    sortValue: (room) => room.roomTypeId,
  },
  {
    id: 'status',
    header: 'Estado',
    cell: (room) => <Badge tone={ROOM_STATUS_TONES[room.status]}>{room.status}</Badge>,
    sortValue: (room) => room.status,
  },
  {
    id: 'housekeepingStatus',
    header: 'Limpieza',
    cell: (room) => (
      <Badge tone={ROOM_HOUSEKEEPING_TONES[room.housekeepingStatus]}>
        {room.housekeepingStatus}
      </Badge>
    ),
    sortValue: (room) => room.housekeepingStatus,
  },
];

export function RoomListScreen() {
  const navigate = useNavigate();
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

  const columns = useMemo<DataTableColumn<Room>[]>(
    () => [
      ...baseColumns,
      {
        id: 'actions',
        header: 'Acciones',
        cell: (room) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(routePaths.pms.roomEdit.replace(':roomId', room.id))}
          >
            Editar
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <section className="content">
      <div className="rooms-header">
        <h1>Habitaciones</h1>
        <Button onClick={() => navigate(routePaths.pms.roomNew)}>Nueva habitación</Button>
      </div>

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
        <DataTable
          columns={columns}
          data={screen.rooms}
          getRowId={(room) => room.id}
          caption="Habitaciones"
        />
      )}
    </section>
  );
}
