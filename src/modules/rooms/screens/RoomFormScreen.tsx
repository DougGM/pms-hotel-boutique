import { useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/components/EmptyState';

export function RoomFormScreen() {
  const { roomId } = useParams<'roomId'>();

  return (
    <section className="content">
      <h1>{roomId ? 'Editar habitación' : 'Nueva habitación'}</h1>
      {roomId && <p className="muted">roomId: {roomId}</p>}
      <EmptyState
        title="En construcción"
        description="El formulario de habitación aparecerá aquí."
      />
    </section>
  );
}
