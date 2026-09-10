export type AuditModule = 'guestAccounts' | 'cash' | 'inventory' | 'catalog' | 'users' | 'bookings';
export type AuditAction = 'create' | 'update' | 'delete' | 'void' | 'open' | 'close';

export interface AuditLog {
  id: string;
  userId: string;
  module: AuditModule;
  action: AuditAction;
  entityType: string;
  entityId: string;
  occurredAt: Date;
  details?: string;
  createdAt: Date;
}
