import { EmptyState } from '@/shared/components/EmptyState';

export function RoomListScreen() {
  return (
    <section className="content">
      <h1>Habitaciones</h1>
      <EmptyState
        title="En construcción"
        description="El listado de habitaciones aparecerá aquí."
      />
    </section>
  );
}
