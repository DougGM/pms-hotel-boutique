import { EmptyState } from '@/shared/components/EmptyState';

export function RoomTypeFormScreen() {
  return (
    <section className="content">
      <h1>Nuevo tipo de habitación</h1>
      <EmptyState
        title="En construcción"
        description="El formulario de tipo de habitación aparecerá aquí."
      />
    </section>
  );
}
