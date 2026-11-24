import type { AuditAction, AuditEntry } from '../entities/audit-entry.entity.js';

export interface AuditPosition {
  createdAt: Date;
  id: string;
}

export interface AuditQuery {
  /** Entries of these projects, or recorded for this user, are visible. */
  visibleTo: { userId: string; projectIds: readonly string[] };
  projectId?: string | undefined;
  action?: AuditAction | undefined;
  after?: AuditPosition | undefined;
  limit: number;
}

export interface AuditRepository {
  append(entry: AuditEntry): Promise<void>;
  /** Newest first. */
  list(query: AuditQuery): Promise<AuditEntry[]>;
}
export const AUDIT_REPOSITORY = Symbol('AuditRepository');
