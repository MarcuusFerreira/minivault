import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import { AuditEntry } from '../../../domain/entities/audit-entry.entity.js';
import type { AuditRepository } from '../../../domain/repositories/audit.repository.js';
import type { RecordAuditEventCommand, RecordAuditEventPort } from '../../ports/input/record-audit-event.port.js';

/** Joins the caller's transaction: the operation and its record succeed or fail together. */
export class RecordAuditEventUseCase implements RecordAuditEventPort {
  constructor(
    private readonly audit: AuditRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute({ occurredAt, ...command }: RecordAuditEventCommand): Promise<void> {
    await this.audit.append(AuditEntry.record({ ...command, id: this.ids.next(), createdAt: occurredAt }));
  }
}
