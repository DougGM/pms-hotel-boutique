import { toDomain as toAuditLog, type AuditLog } from '@/shared/types/entities/audit-log';
import { lotDMockData } from '@/shared/mocks/lot-d';
import { mockUtils, simulateLatency } from './mockUtils';

export const auditService = {
  async getLogs(): Promise<AuditLog[]> {
    await simulateLatency();
    mockUtils.throwIfSimulatingError('No fue posible cargar la auditoría.');
    return lotDMockData.auditLogs.map(toAuditLog);
  },
};
export default auditService;
