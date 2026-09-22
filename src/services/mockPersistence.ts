const hydratedKeys = new Set<string>();

function getStorage(): Storage | undefined {
  if (typeof globalThis.localStorage === 'undefined') return undefined;
  return globalThis.localStorage;
}

export function hydrateCollection<T>(storageKey: string, collection: T[]): T[] {
  if (hydratedKeys.has(storageKey)) return collection;
  hydratedKeys.add(storageKey);

  const storage = getStorage();
  if (!storage) return collection;

  const raw = storage.getItem(storageKey);
  if (!raw) return collection;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return collection;
    collection.splice(0, collection.length, ...(parsed as T[]));
  } catch (cause) {
    console.warn(`[services] No fue posible restaurar ${storageKey} desde localStorage.`, cause);
  }

  return collection;
}

export function persistCollection<T>(storageKey: string, collection: T[]): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(storageKey, JSON.stringify(collection));
}

export function hydrateRecord<T>(storageKey: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;

  const raw = storage.getItem(storageKey);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (cause) {
    console.warn(`[services] No fue posible restaurar ${storageKey} desde localStorage.`, cause);
    return fallback;
  }
}

export function persistRecord<T>(storageKey: string, value: T): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(storageKey, JSON.stringify(value));
}
