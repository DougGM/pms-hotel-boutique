import { useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/components/EmptyState';

export function CheckInScreen() {
  const { bookingId } = useParams<'bookingId'>();

  return (
    <section className="content">
      <h1>Check-in</h1>
      <p className="muted">bookingId: {bookingId}</p>
      <EmptyState title="En construcción" description="El flujo de check-in aparecerá aquí." />
    </section>
  );
}
