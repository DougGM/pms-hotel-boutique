import { EmptyState } from '@/shared/components/EmptyState';

export function OccupancyScreen() {
  return (
    <section className="content">
      <h1>Ocupación</h1>
      <EmptyState title="En construcción" description="El mapa de ocupación aparecerá aquí." />
    </section>
  );
}
