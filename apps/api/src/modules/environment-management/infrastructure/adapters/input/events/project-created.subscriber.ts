import { Inject, Injectable } from '@nestjs/common';
import type { DomainEventSubscriber } from '../../../../../../shared/application/domain-event-publisher.js';
import type { DomainEvent } from '../../../../../../shared/domain/domain-event.js';
import { ProjectCreated } from '../../../../../../shared/domain/events/project.events.js';
import type { Actor } from '../../../../../../shared/domain/principal.js';
import { InProcessEventBus } from '../../../../../../shared/infrastructure/events/in-process-event-bus.js';
import {
  PROVISION_DEFAULT_ENVIRONMENTS,
  type ProvisionDefaultEnvironmentsPort,
} from '../../../../application/ports/input/provision-default-environments.port.js';

@Injectable()
export class ProjectCreatedSubscriber implements DomainEventSubscriber {
  readonly handles = [ProjectCreated.NAME];

  constructor(
    bus: InProcessEventBus,
    @Inject(PROVISION_DEFAULT_ENVIRONMENTS) private readonly provision: ProvisionDefaultEnvironmentsPort,
  ) {
    bus.subscribe(this);
  }

  async handle(event: DomainEvent, actor: Actor): Promise<void> {
    if (event instanceof ProjectCreated) await this.provision.execute({ projectId: event.projectId, actor });
  }
}
