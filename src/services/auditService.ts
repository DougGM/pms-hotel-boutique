import { toDomain as toAuditLog, type AuditLog } from '@/shared/types/entities/audit-log';
import { auditLogsDB } from '@/data/db';
import { mockUtils, requireCollection, simulateLatency } from './mockUtils';

export const auditService = {
  async getLogs(): Promise<AuditLog[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la auditoría.');
    return requireCollection(auditLogsDB, 'auditLogsDB').map(toAuditLog);
  },
};
export default auditService;
