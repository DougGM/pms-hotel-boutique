import {
  authMapper,
  type AuthResponseDTO,
  type AuthSession,
  type User,
} from '@/shared/types/entities';
import { httpClient } from './http-client';
import { mockAuthAccounts } from './authMockData';
import { mockUtils, simulateLatency } from './mockUtils';

export const sessionStorageKey = 'PMS_AUTH_SESSION';
const legacyStorageKey = 'hotel-aurora.auth.v1';
const sessionDuration = 8 * 60 * 60 * 1000;
let revision = 0;

function checkRequest(current: number, signal?: AbortSignal) {
  if (signal?.aborted || current !== revision)
    throw new DOMException('Solicitud cancelada', 'AbortError');
}

export const authService = {
  clearSession(): void {
    ++revision;
    httpClient.clearToken();
    try {
      localStorage.removeItem(sessionStorageKey);
    } finally {
      localStorage.removeItem(legacyStorageKey);
    }
  },
  async login(email: string, password: string, signal?: AbortSignal): Promise<AuthSession> {
    const current = ++revision;
    await simulateLatency();
    checkRequest(current, signal);
    mockUtils.throwIfSimulatingError('No fue posible iniciar sesión. Intenta nuevamente.');
    const account = mockAuthAccounts.find((item) => item.user.email === email.trim().toLowerCase());
    if (!account || account.password !== password)
      throw new Error('Correo o contraseña incorrectos.');
    const dto: AuthResponseDTO = {
      user: { ...account.user },
      token: `mock-access-${account.user.id}`,
      refreshToken: `mock-refresh-${account.user.id}`,
      expiresAt: new Date(Date.now() + sessionDuration).toISOString(),
    };
    try {
      localStorage.removeItem(legacyStorageKey);
      localStorage.setItem(sessionStorageKey, JSON.stringify(dto));
    } catch {
      httpClient.clearToken();
      throw new Error(
        'No se pudo guardar la sesión. Habilita el almacenamiento del navegador e intenta nuevamente.',
      );
    }
    httpClient.setToken(dto.token);
    return authMapper.toSession(dto);
  },
  async getCurrentSession(signal?: AbortSignal): Promise<AuthSession | null> {
    const current = revision;
    httpClient.clearToken();
    // Clear obsolete WEB-06 storage; users sign in again against WEB-05.
    localStorage.removeItem(legacyStorageKey);
    const raw = localStorage.getItem(sessionStorageKey);
    if (!raw) {
      httpClient.clearToken();
      return null;
    }
    await simulateLatency();
    checkRequest(current, signal);
    if (localStorage.getItem(sessionStorageKey) !== raw) return null;
    mockUtils.throwIfSimulatingError('No fue posible recuperar la sesión.');
    let stored: unknown;
    try {
      stored = JSON.parse(raw);
    } catch {
      this.clearSession();
      return null;
    }
    if (!stored || typeof stored !== 'object') {
      this.clearSession();
      return null;
    }
    const value = stored as Partial<AuthResponseDTO>;
    const account = mockAuthAccounts.find((item) => item.user.id === value.user?.id);
    const expiresAt = typeof value.expiresAt === 'string' ? Date.parse(value.expiresAt) : NaN;
    if (
      !account ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now() ||
      expiresAt > Date.now() + sessionDuration ||
      value.token !== `mock-access-${account.user.id}` ||
      value.refreshToken !== `mock-refresh-${account.user.id}`
    ) {
      this.clearSession();
      return null;
    }
    // The browser does not decide the role or permissions, even in the demo.
    const session = authMapper.toSession({
      user: { ...account.user },
      token: value.token,
      refreshToken: value.refreshToken,
      expiresAt: new Date(expiresAt).toISOString(),
    });
    httpClient.setToken(session.token);
    return session;
  },
  async getCurrentUser(): Promise<User | null> {
    return (await this.getCurrentSession())?.user ?? null;
  },
  async logout(): Promise<void> {
    // Local credentials are always removed, even if the simulated request fails.
    this.clearSession();
    await simulateLatency();
    mockUtils.throwIfSimulatingError(
      'La sesión local se cerró, pero no se pudo confirmar con el servicio.',
    );
  },
};
export default authService;
