import { useParams } from 'react-router-dom';
import { EmptyState } from '@/shared/components/EmptyState';

export function GuestAccountScreen() {
  const { accountId } = useParams<'accountId'>();

  return (
    <section className="content">
      <h1>Cuenta del huésped</h1>
      <p className="muted">accountId: {accountId}</p>
      <EmptyState title="En construcción" description="El detalle de la cuenta aparecerá aquí." />
    </section>
  );
}
