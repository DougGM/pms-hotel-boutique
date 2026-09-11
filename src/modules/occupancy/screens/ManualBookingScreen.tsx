import { EmptyState } from '@/shared/components/EmptyState';

export function ManualBookingScreen() {
  return (
    <section className="content">
      <h1>Nueva reserva manual</h1>
      <EmptyState
        title="En construcción"
        description="El formulario de reserva manual aparecerá aquí."
      />
    </section>
  );
}
