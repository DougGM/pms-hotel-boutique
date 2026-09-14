import { EmptyState } from '@/shared/components/EmptyState';

export function RoomTypeListScreen() {
  return (
    <section className="content">
      <h1>Tipos de habitación</h1>
      <EmptyState
        title="En construcción"
        description="El listado de tipos de habitación aparecerá aquí."
      />
    </section>
  );
}
