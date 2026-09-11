import { EmptyState } from '@/shared/components/EmptyState';

export function BookingFormScreen() {
  return (
    <section className="content">
      <h1>Reservar</h1>
      <EmptyState title="En construcción" description="El formulario de reserva aparecerá aquí." />
    </section>
  );
}
