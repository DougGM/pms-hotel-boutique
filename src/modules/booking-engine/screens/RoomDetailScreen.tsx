import { useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/components/EmptyState';

export function RoomDetailScreen() {
  const { roomTypeId } = useParams<'roomTypeId'>();

  return (
    <section className="content">
      <h1>Detalle de habitación</h1>
      <p className="muted">roomTypeId: {roomTypeId}</p>
      <EmptyState
        title="En construcción"
        description="El detalle del tipo de habitación aparecerá aquí."
      />
    </section>
  );
}
