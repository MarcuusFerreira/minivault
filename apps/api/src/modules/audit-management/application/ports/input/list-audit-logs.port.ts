import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { AuditAction, AuditEntryState } from '../../../domain/entities/audit-entry.entity.js';
import type { AuditPosition } from '../../../domain/repositories/audit.repository.js';

export interface ListAuditLogsQuery {
  context: RequestContext;
  projectId?: string | undefined;
  action?: AuditAction | undefined;
  after?: AuditPosition | undefined;
  limit: number;
}
export interface ListAuditLogsPort {
  execute(query: ListAuditLogsQuery): Promise<{ items: Readonly<AuditEntryState>[]; next: AuditPosition | null }>;
}
export const LIST_AUDIT_LOGS = Symbol('ListAuditLogsPort');
