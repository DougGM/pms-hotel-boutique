import {
  toAuthSession,
  type AuthResponseDTO,
  type AuthSession,
  type BackendAuthResponseDTO,
  type SessionUser,
} from '@/shared/types/entities/session';
import type { UserRole } from '@/shared/types/common';
import { httpClient, HttpError } from './http-client';

export const sessionStorageKey = 'PMS_AUTH_SESSION';
const legacyStorageKey = 'hotel-aurora.auth.v1';
const sessionDuration = 8 * 60 * 60 * 1000;
let revision = 0;

type JwtPayload = {
  sub?: string;
  authorities?: string[];
  type?: string;
  iat?: number;
  exp?: number;
};

const roleCodes: Record<string, UserRole> = {
  ADMIN: 'ADMIN',
  GUEST: 'GUEST',
  RECEPTION: 'RECEPTION',
  HOUSEKEEPING: 'HOUSEKEEPING',
  CONCIERGE: 'CONCIERGE',
  ROOM_SERVICE: 'ROOM_SERVICE',
};

function checkRequest(current: number, signal?: AbortSignal) {
  if (signal?.aborted || current !== revision)
    throw new DOMException('Solicitud cancelada', 'AbortError');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeJwt(token: string): JwtPayload {
  const [, payload] = token.split('.');
  if (!payload) throw new Error('El token de acceso no tiene el formato esperado.');
  const decoded = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  return {
    ...decoded,
    authorities: Array.isArray(decoded.authorities) ? decoded.authorities : [],
  };
}

function roleFromAuthorities(authorities: readonly string[]): UserRole {
  const authority = authorities.find((item) => item.startsWith('ROLE_'));
  const code = authority?.replace(/^ROLE_/, '').toUpperCase();
  const role = code ? roleCodes[code] : undefined;
  if (!role) throw new Error('El token no incluye un rol reconocido para el PMS.');
  return role;
}

function displayNameFromEmail(email: string): string {
  const [name] = email.split('@');
  return name
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function messageFromHttpError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpError)) return error instanceof Error ? error.message : fallback;
  const data = error.data;
  if (data && typeof data === 'object') {
    const value = data as { message?: unknown; error?: unknown };
    if (typeof value.message === 'string' && value.message.trim()) return value.message;
    if (typeof value.error === 'string' && value.error.trim()) return value.error;
  }
  return fallback;
}

function normalizeAuthResponse(
  response: BackendAuthResponseDTO,
  sessionExpiresAt?: string,
): AuthResponseDTO {
  const payload = decodeJwt(response.accessToken);
  const email = payload.sub?.trim().toLowerCase();
  if (!email) throw new Error('El token no incluye la identidad del usuario.');
  const authorities = payload.authorities ?? [];
  const role = roleFromAuthorities(authorities);
  const issuedAt = payload.iat ? new Date(payload.iat * 1000) : new Date();
  const accessExpiresAt = payload.exp
    ? new Date(payload.exp * 1000)
    : new Date(Date.now() + response.expiresIn * 1000);
  return {
    user: {
      id: email,
      email,
      name: displayNameFromEmail(email),
      role,
      createdAt: issuedAt.toISOString(),
    },
    token: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: sessionExpiresAt ?? new Date(Date.now() + sessionDuration).toISOString(),
    accessExpiresAt: accessExpiresAt.toISOString(),
    tokenType: response.tokenType,
    authorities,
  };
}

function readStoredSession(): AuthResponseDTO | null {
  localStorage.removeItem(legacyStorageKey);
  const raw = localStorage.getItem(sessionStorageKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AuthResponseDTO>;
    if (
      !value ||
      typeof value !== 'object' ||
      typeof value.token !== 'string' ||
      typeof value.refreshToken !== 'string' ||
      typeof value.expiresAt !== 'string' ||
      !value.user ||
      typeof value.user.email !== 'string'
    ) {
      return null;
    }
    return value as AuthResponseDTO;
  } catch {
    return null;
  }
}

function persistSession(dto: AuthResponseDTO): void {
  try {
    localStorage.removeItem(legacyStorageKey);
    localStorage.setItem(sessionStorageKey, JSON.stringify(dto));
  } catch {
    httpClient.clearToken();
    throw new Error(
      'No se pudo guardar la sesión. Habilita el almacenamiento del navegador e intenta nuevamente.',
    );
  }
}

async function refreshStoredSession(): Promise<string | null> {
  const stored = readStoredSession();
  if (!stored) return null;
  try {
    const response = await httpClient.post<BackendAuthResponseDTO>(
      '/auth/refresh',
      { refreshToken: stored.refreshToken },
      { auth: { skipAuthorization: true, skipRefresh: true } },
    );
    const next = normalizeAuthResponse(response, stored.expiresAt);
    persistSession(next);
    return next.token;
  } catch {
    authService.clearSession();
    return null;
  }
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
    checkRequest(current, signal);
    try {
      const response = await httpClient.post<BackendAuthResponseDTO>(
        '/auth/login',
        { email: email.trim().toLowerCase(), password },
        { signal, auth: { skipAuthorization: true, skipRefresh: true } },
      );
      checkRequest(current, signal);
      const dto = normalizeAuthResponse(response);
      persistSession(dto);
      httpClient.setToken(dto.token);
      return toAuthSession(dto);
    } catch (error) {
      checkRequest(current, signal);
      throw new Error(messageFromHttpError(error, 'Correo o contraseña incorrectos.'));
    }
  },
  async getCurrentSession(signal?: AbortSignal): Promise<AuthSession | null> {
    const current = revision;
    httpClient.clearToken();
    const hadStoredSession = localStorage.getItem(sessionStorageKey) !== null;
    const stored = readStoredSession();
    if (!stored) {
      if (hadStoredSession) this.clearSession();
      return null;
    }
    checkRequest(current, signal);
    const expiresAt = Date.parse(stored.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      this.clearSession();
      return null;
    }
    try {
      const normalized = normalizeAuthResponse(
        {
          accessToken: stored.token,
          refreshToken: stored.refreshToken,
          tokenType: stored.tokenType ?? 'Bearer',
          expiresIn: 0,
        },
        stored.expiresAt,
      );
      checkRequest(current, signal);
      persistSession(normalized);
      httpClient.setToken(normalized.token);
      return toAuthSession(normalized);
    } catch {
      this.clearSession();
      return null;
    }
  },
  async getCurrentUser(): Promise<SessionUser | null> {
    return (await this.getCurrentSession())?.user ?? null;
  },
  async logout(): Promise<void> {
    const stored = readStoredSession();
    this.clearSession();
    if (!stored?.refreshToken) return;
    try {
      await httpClient.post<void>(
        '/auth/logout',
        { refreshToken: stored.refreshToken },
        { auth: { skipAuthorization: true, skipRefresh: true } },
      );
    } catch (error) {
      throw new Error(
        messageFromHttpError(
          error,
          'La sesión local se cerró, pero no se pudo confirmar con el servicio.',
        ),
      );
    }
  },
};

httpClient.setRefreshHandler(refreshStoredSession);
httpClient.setUnauthorizedHandler(() => authService.clearSession());

export default authService;
