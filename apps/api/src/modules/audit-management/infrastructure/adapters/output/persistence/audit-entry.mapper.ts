import type { AuditLog as AuditRow, Prisma } from '../../../../../../generated/prisma/client.js';
import { type AuditAction, AuditEntry, type AuditResourceType } from '../../../../domain/entities/audit-entry.entity.js';
import { AuditMetadata } from '../../../../domain/value-objects/audit-metadata.vo.js';

export const auditEntryMapper = {
  toDomain: (row: AuditRow): AuditEntry =>
    AuditEntry.restore({
      ...row,
      action: row.action as AuditAction,
      resourceType: row.resourceType as AuditResourceType,
      metadata: AuditMetadata.create(row.metadata as Record<string, unknown>),
    }),
  toRow: ({ state }: AuditEntry): Prisma.AuditLogCreateInput => ({
    ...state,
    metadata: state.metadata.value as Prisma.InputJsonObject,
  }),
};
