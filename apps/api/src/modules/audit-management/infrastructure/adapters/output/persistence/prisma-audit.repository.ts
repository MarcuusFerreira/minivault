import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaContext } from '../../../../../../shared/infrastructure/prisma/prisma-context.js';
import type { AuditEntry } from '../../../../domain/entities/audit-entry.entity.js';
import type { AuditQuery, AuditRepository } from '../../../../domain/repositories/audit.repository.js';
import { auditEntryMapper } from './audit-entry.mapper.js';

@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly context: PrismaContext) {}

  async append(entry: AuditEntry): Promise<void> {
    await this.context.client.auditLog.create({ data: auditEntryMapper.toRow(entry) });
  }

  async list({ visibleTo, projectId, action, after, limit }: AuditQuery): Promise<AuditEntry[]> {
    const conditions: Prisma.AuditLogWhereInput[] = [
      { OR: [{ projectId: { in: [...visibleTo.projectIds] } }, { userId: visibleTo.userId }] },
    ];
    if (projectId !== undefined) conditions.push({ projectId });
    if (action !== undefined) conditions.push({ action });
    if (after) {
      conditions.push({ OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] });
    }
    const rows = await this.context.client.auditLog.findMany({
      where: { AND: conditions },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.map(auditEntryMapper.toDomain);
  }
}
