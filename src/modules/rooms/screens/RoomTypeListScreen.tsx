import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routePaths } from '@/app/routes';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { DataTable, type DataTableColumn } from '@/shared/components/DataTable';
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

type RoomTypeRow = { roomType: RoomType; featureNames: string; baseRate: Rate | undefined };

function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Error inesperado.';
}

/** Mismo criterio que `findFallbackRate` en RoomDetailScreen (booking-engine):
 * la tarifa activa más barata del tipo, usada como "precio base" sin fechas. */
function findBaseRate(rates: Rate[], roomTypeId: string): Rate | undefined {
  return rates
    .filter((rate) => rate.active && rate.roomTypeId === roomTypeId)
    .sort((left, right) => left.priceCents - right.priceCents)[0];
}

export function RoomTypeListScreen() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<ScreenState>({ status: 'loading' });

  const loadData = useCallback(async () => {
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
    void loadData();
  }, [loadData]);

  const rows = useMemo<RoomTypeRow[]>(() => {
    if (screen.status !== 'ready') return [];
    const featureNameById = new Map(
      screen.roomFeatures.map((feature) => [feature.id, feature.name]),
    );
    return screen.roomTypes
      .map((roomType) => ({
        roomType,
        featureNames:
          roomType.roomFeatureIds.map((id) => featureNameById.get(id) ?? id).join(', ') || '—',
        baseRate: findBaseRate(screen.rates, roomType.id),
      }))
      .sort((left, right) => left.roomType.name.localeCompare(right.roomType.name, 'es'));
  }, [screen]);

  const columns: DataTableColumn<RoomTypeRow>[] = [
    {
      id: 'code',
      header: 'Código',
      cell: ({ roomType }) => roomType.code,
      sortValue: ({ roomType }) => roomType.code,
    },
    {
      id: 'name',
      header: 'Nombre',
      cell: ({ roomType }) => roomType.name,
      sortValue: ({ roomType }) => roomType.name,
    },
    {
      id: 'bedConfiguration',
      header: 'Configuración de camas',
      cell: ({ roomType }) => roomType.bedConfiguration,
    },
    {
      id: 'capacity',
      header: 'Capacidad',
      cell: ({ roomType }) => roomType.capacity,
      sortValue: ({ roomType }) => roomType.capacity,
    },
    {
      id: 'features',
      header: 'Características',
      cell: ({ featureNames }) => featureNames,
    },
    {
      id: 'basePrice',
      header: 'Precio base',
      cell: ({ baseRate }) =>
        baseRate ? formatCurrency(baseRate.priceCents, baseRate.currency) : 'Sin tarifa activa',
      sortValue: ({ baseRate }) => baseRate?.priceCents ?? -1,
    },
    {
      id: 'active',
      header: 'Estado',
      cell: ({ roomType }) => (
        <Badge tone={roomType.active ? 'success' : 'neutral'}>
          {roomType.active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      sortValue: ({ roomType }) => (roomType.active ? 1 : 0),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ roomType }) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(routePaths.pms.roomTypeEdit.replace(':roomTypeId', roomType.id))}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <section className="content">
      <div className="rooms-header">
        <div>
          <h1>Tipos de habitación</h1>
          <p className="rooms-muted">Catálogo de tipos de habitación del hotel.</p>
        </div>
        <Button onClick={() => navigate(routePaths.pms.roomTypeNew)}>Nuevo tipo</Button>
      </div>

      {screen.status === 'loading' && <LoadingState label="Cargando tipos de habitación..." />}

      {screen.status === 'error' && (
        <ErrorState
          title="No pudimos cargar los tipos de habitación"
          description={screen.message}
          onRetry={loadData}
        />
      )}

      {screen.status === 'ready' && (
        <DataTable
          caption="Tipos de habitación"
          columns={columns}
          data={rows}
          getRowId={(row) => row.roomType.id}
          pageSize={10}
          emptyMessage="Todavía no hay tipos de habitación registrados."
        />
      )}
    </section>
  );
}
