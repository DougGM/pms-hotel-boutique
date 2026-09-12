import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { Badge, type BadgeTone } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
import { EmptyState } from '@/shared/components/EmptyState';
import { ErrorState } from '@/shared/components/ErrorState';
import { LoadingState } from '@/shared/components/LoadingState';
import { roomService } from '@/services/roomService';
import type { RoomType } from '@/shared/types/entities/room-type';
import './rooms.css';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; roomTypes: RoomType[] };

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

function activeTone(active: boolean): BadgeTone {
  return active ? 'success' : 'neutral';
}

const columns: DataTableColumn<RoomType>[] = [
  {
    id: 'code',
    header: 'Código',
    cell: (roomType) => roomType.code,
    sortValue: (roomType) => roomType.code,
  },
  {
    id: 'name',
    header: 'Nombre',
    cell: (roomType) => roomType.name,
    sortValue: (roomType) => roomType.name,
  },
  {
    id: 'capacity',
    header: 'Capacidad',
    cell: (roomType) => `${roomType.capacity} personas`,
    sortValue: (roomType) => roomType.capacity,
  },
  {
    id: 'bedConfiguration',
    header: 'Configuración de cama',
    cell: (roomType) => roomType.bedConfiguration,
    sortValue: (roomType) => roomType.bedConfiguration,
  },
  {
    id: 'active',
    header: 'Estado',
    cell: (roomType) => (
      <Badge tone={activeTone(roomType.active)}>{roomType.active ? 'Activo' : 'Inactivo'}</Badge>
    ),
    sortValue: (roomType) => (roomType.active ? 1 : 0),
  },
];

export function RoomTypeListScreen() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });

  const loadRoomTypes = useCallback(async () => {
    setScreen({ status: 'loading' });
    try {
      const roomTypes = await roomService.getRoomTypes();
      setScreen({ status: 'ready', roomTypes });
    } catch (cause) {
      setScreen({ status: 'error', message: getErrorMessage(cause) });
    }
  }, []);

  useEffect(() => {
    void loadRoomTypes();
  }, [loadRoomTypes]);

  return (
    <section className="content">
      <div className="rooms-header">
        <h1>Tipos de habitación</h1>
        <Button onClick={() => navigate(routePaths.pms.roomTypeNew)}>
          Nuevo tipo de habitación
        </Button>
      </div>

      {screen.status === 'loading' && <LoadingState label="Cargando tipos de habitación..." />}

      {screen.status === 'error' && (
        <ErrorState
          title="No pudimos cargar los tipos de habitación"
          description={screen.message}
          onRetry={loadRoomTypes}
        />
      )}

      {screen.status === 'ready' && screen.roomTypes.length === 0 && (
        <EmptyState
          title="Sin tipos de habitación"
          description="No hay tipos de habitación registrados todavía."
        />
      )}

      {screen.status === 'ready' && screen.roomTypes.length > 0 && (
        <DataTable
          columns={columns}
          data={screen.roomTypes}
          getRowId={(roomType) => roomType.id}
          caption="Tipos de habitación"
        />
      )}
    </section>
  );
}
