import { useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/components/EmptyState';

export function BookingConfirmationScreen() {
  const { bookingId } = useParams<'bookingId'>();

  return (
    <section className="content">
      <h1>Reserva confirmada</h1>
      <p className="muted">bookingId: {bookingId}</p>
      <EmptyState
        title="En construcción"
        description="El comprobante de la reserva aparecerá aquí."
      />
    </section>
  );
}
