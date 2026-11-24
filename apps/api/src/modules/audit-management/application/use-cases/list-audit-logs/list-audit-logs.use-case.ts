import { requireUser } from '../../../../../shared/application/require-user.js';
import type { AuditEntryState } from '../../../domain/entities/audit-entry.entity.js';
import type { AuditPosition, AuditRepository } from '../../../domain/repositories/audit.repository.js';
import type { ListAuditLogsPort, ListAuditLogsQuery } from '../../ports/input/list-audit-logs.port.js';
import type { OwnedProjects } from '../../ports/output/owned-projects.port.js';

export class ListAuditLogsUseCase implements ListAuditLogsPort {
  constructor(
    private readonly audit: AuditRepository,
    private readonly projects: OwnedProjects,
  ) {}

  async execute(query: ListAuditLogsQuery): Promise<{ items: Readonly<AuditEntryState>[]; next: AuditPosition | null }> {
    const { context, limit, ...filters } = query;
    const userId = requireUser(context);
    const visibleTo = { userId, projectIds: await this.projects.idsOf(userId) };
    // One extra row tells whether another page exists.
    const entries = await this.audit.list({ ...filters, visibleTo, limit: limit + 1 });
    const items = entries.slice(0, limit).map((entry) => entry.state);
    const last = items.at(-1);
    return { items, next: entries.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null };
  }
}
