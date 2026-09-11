import { EmptyState } from '@/shared/components/EmptyState';

export function SearchScreen() {
  return (
    <section className="content">
      <h1>Buscar disponibilidad</h1>
      <EmptyState
        title="En construcción"
        description="El buscador de habitaciones aparecerá aquí."
      />
    </section>
  );
}
