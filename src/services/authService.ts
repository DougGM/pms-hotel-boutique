import { authMapper, type AuthSession, type User } from '@/shared/types/entities';
import { httpClient } from './http-client';
import { mockAuthResponse } from './mockData';
import { mockUtils, simulateLatency } from './mockUtils';

const SESSION_KEY = 'PMS_AUTH_SESSION';
export const authService = {
  async login(email: string, password: string): Promise<AuthSession> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible iniciar sesión.'); void password; if (email !== mockAuthResponse.user.email) throw new Error('Credenciales inválidas.'); const session = authMapper.toSession(mockAuthResponse); localStorage.setItem(SESSION_KEY, JSON.stringify(mockAuthResponse)); httpClient.setToken(session.token); return session; },
  async getCurrentUser(): Promise<User | null> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible recuperar la sesión.'); const raw = localStorage.getItem(SESSION_KEY); if (!raw) return null; const session = authMapper.toSession(JSON.parse(raw)); httpClient.setToken(session.token); return session.user; },
  async logout(): Promise<void> { await simulateLatency(); mockUtils.throwIfSimulatingError('No fue posible cerrar sesión.'); localStorage.removeItem(SESSION_KEY); httpClient.clearToken(); },
};
export default authService;
