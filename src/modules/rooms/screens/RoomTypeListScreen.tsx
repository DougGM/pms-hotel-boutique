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
import type { Rate } from '@/shared/types/entities/rate';
import type { RoomFeature } from '@/shared/types/entities/room-feature';
import type { RoomType } from '@/shared/types/entities/room-type';
import { formatCurrency } from '@/shared/utils/currency';
import './rooms.css';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; roomTypes: RoomType[]; roomFeatures: RoomFeature[]; rates: Rate[] };

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

function activeTone(active: boolean): BadgeTone {
  return active ? 'success' : 'neutral';
}

/** Misma selección que `findFallbackRate` en RoomDetailScreen (booking-engine):
 * la tarifa activa más barata del tipo, usada como "precio base" sin fechas. */
function findBaseRate(rates: Rate[], roomTypeId: string): Rate | undefined {
  return rates
    .filter((rate) => rate.active && rate.roomTypeId === roomTypeId)
    .sort((left, right) => left.priceCents - right.priceCents)[0];
}

export function RoomTypeListScreen() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });

  const loadRoomTypes = useCallback(async () => {
    setScreen({ status: 'loading' });
    try {
      const [roomTypes, roomFeatures, rates] = await Promise.all([
        roomService.getRoomTypes(),
        roomService.getRoomFeatures(),
        roomService.getRates(),
      ]);
      setScreen({ status: 'ready', roomTypes, roomFeatures, rates });
    } catch (cause) {
      setScreen({ status: 'error', message: getErrorMessage(cause) });
    }
  }, []);

  useEffect(() => {
    void loadRoomTypes();
  }, [loadRoomTypes]);

  const columns = useMemo<DataTableColumn<RoomType>[]>(() => {
    if (screen.status !== 'ready') return [];
    const featureById = new Map(screen.roomFeatures.map((feature) => [feature.id, feature.name]));

    return [
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
        id: 'features',
        header: 'Características',
        cell: (roomType) => {
          const names = roomType.roomFeatureIds.map((id) => featureById.get(id) ?? id);
          return names.length > 0 ? names.join(', ') : '—';
        },
        sortValue: (roomType) =>
          roomType.roomFeatureIds.map((id) => featureById.get(id) ?? id).join(', '),
      },
      {
        id: 'basePrice',
        header: 'Precio base',
        cell: (roomType) => {
          const rate = findBaseRate(screen.rates, roomType.id);
          return rate ? formatCurrency(rate.priceCents, rate.currency) : 'Sin tarifa activa';
        },
        sortValue: (roomType) => findBaseRate(screen.rates, roomType.id)?.priceCents ?? -1,
      },
      {
        id: 'active',
        header: 'Estado',
        cell: (roomType) => (
          <Badge tone={activeTone(roomType.active)}>
            {roomType.active ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
        sortValue: (roomType) => (roomType.active ? 1 : 0),
      },
    ];
  }, [screen]);

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
