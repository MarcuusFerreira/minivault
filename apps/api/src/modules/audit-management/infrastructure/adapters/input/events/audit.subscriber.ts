import { Inject, Injectable } from '@nestjs/common';
import type { DomainEventSubscriber } from '../../../../../../shared/application/domain-event-publisher.js';
import type { DomainEvent } from '../../../../../../shared/domain/domain-event.js';
import type { Actor } from '../../../../../../shared/domain/principal.js';
import { InProcessEventBus } from '../../../../../../shared/infrastructure/events/in-process-event-bus.js';
import { RECORD_AUDIT_EVENT, type RecordAuditEventPort } from '../../../../application/ports/input/record-audit-event.port.js';
import { AUDITED_EVENTS, toAuditCommand } from './audit-event.mapper.js';

@Injectable()
export class AuditSubscriber implements DomainEventSubscriber {
  readonly handles = AUDITED_EVENTS;

  constructor(
    bus: InProcessEventBus,
    @Inject(RECORD_AUDIT_EVENT) private readonly recordAuditEvent: RecordAuditEventPort,
  ) {
    bus.subscribe(this);
  }

  handle(event: DomainEvent, actor: Actor): Promise<void> {
    return this.recordAuditEvent.execute(toAuditCommand(event, actor));
  }
}
