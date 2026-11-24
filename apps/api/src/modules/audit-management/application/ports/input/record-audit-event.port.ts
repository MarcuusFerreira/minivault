import type { Actor } from '../../../../../shared/domain/principal.js';
import type { AuditAction, AuditResourceType } from '../../../domain/entities/audit-entry.entity.js';

export interface RecordAuditEventCommand {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  projectId: string;
  environmentId: string | null;
  metadata: Record<string, unknown>;
  actor: Actor;
  occurredAt: Date;
}
export interface RecordAuditEventPort {
  execute(command: RecordAuditEventCommand): Promise<void>;
}
export const RECORD_AUDIT_EVENT = Symbol('RecordAuditEventPort');
