let forceError = false;

export async function simulateLatency(minMs = 300, maxMs = 600): Promise<void> {
  const min = Math.max(0, Math.min(minMs, maxMs));
  const max = Math.max(min, maxMs);
  const delay = min + Math.random() * (max - min);
  await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delay));
}

function hasUrlErrorFlag(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mockError') === 'true'
  );
}

function hasStorageErrorFlag(): boolean {
  return (
    typeof localStorage !== 'undefined' && localStorage.getItem('PMS_FORCE_MOCK_ERROR') === 'true'
  );
}

/**
 * Una colección ausente en data/db.ts (undefined/null) es un hueco en los
 * datos de prueba, no "no hay datos" — nombra la colección en consola y
 * lanza, para que el error llegue a ErrorState en vez de a un EmptyState
 * engañoso. Una colección presente pero vacía ([]) pasa de largo: ese caso
 * sí es un dato válido y lo resuelve EmptyState en la pantalla.
 */
export function requireCollection<T>(collection: T[] | undefined | null, name: string): T[] {
  if (!collection) {
    console.error(`[services] Colección ausente en data/db.ts: ${name}`);
    throw new Error(`No fue posible cargar "${name}": la colección no existe en los datos.`);
  }
  return collection;
}

export const mockUtils = {
  setForceError(value: boolean): void {
    forceError = value;
  },
  throwIfSimulatingError(message = 'Error simulado por la capa de servicios'): void {
    if (forceError || hasUrlErrorFlag() || hasStorageErrorFlag()) throw new Error(message);
  },
};

export const { setForceError, throwIfSimulatingError } = mockUtils;
