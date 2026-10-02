import {
  toDomain as toAuditLog,
  type AuditActionDto,
  type AuditLog,
  type AuditLogDto,
  type AuditModuleDto,
} from '@/shared/types/entities/audit-log';
import { auditLogsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';
import { httpClient } from './http-client';

type ApiAuditLog = {
  id: string;
  userId?: string;
  userEmail?: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  occurredAt: string;
  details?: string;
};

const knownModules = new Set<AuditModuleDto>([
  'guest_accounts',
  'cash',
  'inventory',
  'catalog',
  'users',
  'bookings',
]);
const knownActions = new Set<AuditActionDto>([
  'create',
  'update',
  'delete',
  'void',
  'open',
  'close',
]);
const defaultFrom = '2000-01-01T00:00:00-06:00';
const defaultTo = '2100-01-01T00:00:00-06:00';

const isOfflineError = (error: unknown): boolean =>
  !(typeof error === 'object' && error !== null && 'status' in error) ||
  (typeof error === 'object' && error !== null && 'status' in error && error.status === 404);

const toModule = (module: string): AuditModuleDto => {
  const normalized = module === 'guestAccounts' ? 'guest_accounts' : module;
  return knownModules.has(normalized as AuditModuleDto)
    ? (normalized as AuditModuleDto)
    : 'catalog';
};

const toAction = (action: string): AuditActionDto =>
  knownActions.has(action as AuditActionDto) ? (action as AuditActionDto) : 'update';

function toAuditLogDto(api: ApiAuditLog): AuditLogDto {
  return {
    id: api.id,
    user_id: api.userId ?? '',
    module: toModule(api.module),
    action: toAction(api.action),
    entity_type: api.entityType,
    entity_id: api.entityId,
    occurred_at: api.occurredAt,
    details: api.details ?? api.userEmail,
    created_at: api.occurredAt,
  };
}

export const auditService = {
  async getLogs(range: { from?: string | Date; to?: string | Date } = {}): Promise<AuditLog[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la auditoría.');
    const from =
      range.from instanceof Date ? range.from.toISOString() : (range.from ?? defaultFrom);
    const to = range.to instanceof Date ? range.to.toISOString() : (range.to ?? defaultTo);
    try {
      const params = new URLSearchParams({ from, to });
      const logs = await httpClient.get<ApiAuditLog[]>(`/admin/audit-logs?${params.toString()}`);
      return logs.map(toAuditLogDto).map(toAuditLog);
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      return requireCollection(auditLogsDB, 'auditLogsDB').map(toAuditLog);
    }
  },
};
export default auditService;
