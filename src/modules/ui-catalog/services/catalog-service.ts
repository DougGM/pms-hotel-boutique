export interface CatalogRecord {
  id: number;
  name: string;
  capacity: number;
  status: 'Disponible' | 'Ocupada' | 'En limpieza';
}

// Display fixtures only; unrelated to the shared business data contract.
// Deliberate exception to "src/data/db.ts is the only file with invented
// business data" (see the PR that introduced db.ts): CatalogRecord isn't an
// entity from the contract, has no DTO, and exists only to render the
// /components demo page — it stays here rather than in db.ts.
export async function getCatalogRecords({ fail = false } = {}): Promise<CatalogRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  if (fail) throw new Error('Error de demostración');
  return Array.from({ length: 13 }, (_, index) => ({
    id: index + 1,
    name: `Habitación ${101 + index}`,
    capacity: [2, 4, 3][index % 3],
    status: (['Disponible', 'Ocupada', 'En limpieza'] as const)[index % 3],
  }));
}
