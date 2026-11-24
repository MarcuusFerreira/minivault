import { Controller, Get, Inject, Query } from '@nestjs/common';
import { type AuditLogPage, type AuditLogQuery, type AuditLogResponse, auditLogQuery } from '@minivault/contracts';
import type { RequestContext } from '../../../../../../shared/domain/principal.js';
import { Ctx } from '../../../../../../shared/infrastructure/http/auth/request-context.decorator.js';
import { LIST_AUDIT_LOGS, type ListAuditLogsPort } from '../../../../application/ports/input/list-audit-logs.port.js';
import { decodeCursor, encodeCursor } from './audit-cursor.js';

type View = Awaited<ReturnType<ListAuditLogsPort['execute']>>['items'][number];

function toResponse({ userId, metadata, createdAt, ...entry }: View): AuditLogResponse {
  const { apiKeyId, ...details } = metadata.value;
  return {
    ...entry,
    actor: userId === null ? { type: 'apiKey', id: String(apiKeyId ?? '') } : { type: 'user', id: userId },
    metadata: details,
    createdAt: createdAt.toISOString(),
  };
}

@Controller('audit-logs')
export class AuditLogsController {
  constructor(@Inject(LIST_AUDIT_LOGS) private readonly listAuditLogs: ListAuditLogsPort) {}

  @Get()
  async list(@Ctx() context: RequestContext, @Query({ schema: auditLogQuery }) query: AuditLogQuery): Promise<AuditLogPage> {
    const { cursor, ...filters } = query;
    const { items, next } = await this.listAuditLogs.execute({
      context,
      ...filters,
      after: cursor === undefined ? undefined : decodeCursor(cursor),
    });
    return { items: items.map(toResponse), nextCursor: next && encodeCursor(next) };
  }
}
