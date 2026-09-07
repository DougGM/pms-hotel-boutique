const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: unknown,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  private token?: string;

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = undefined;
  }

  get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>('GET', path, undefined, init);
  }

  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>('POST', path, body, init);
  }

  put<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>('PUT', path, body, init);
  }

  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>('DELETE', path, undefined, init);
  }

  private async request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
    const url = new URL(path.replace(/^\/+/, ''), `${baseUrl.replace(/\/+$/, '')}/`);
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);

    const response = await fetch(url, {
      ...init,
      method,
      headers,
      body: body === undefined ? init?.body : JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') ?? '';
    const data = response.status === 204 ? undefined : contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new HttpError(response.status, response.statusText, data);
    return data as T;
  }
}

export const httpClient = new HttpClient();
export default httpClient;
