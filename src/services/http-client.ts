const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export async function httpClient<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured. Copy .env.example to .env.');
  }

  const response = await fetch(new URL(path, apiBaseUrl), {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
