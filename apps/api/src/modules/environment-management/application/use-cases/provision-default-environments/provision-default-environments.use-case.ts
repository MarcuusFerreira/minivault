import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import { Environment } from '../../../domain/entities/environment.entity.js';
import type { EnvironmentRepository } from '../../../domain/repositories/environment.repository.js';
import { EnvironmentName } from '../../../domain/value-objects/environment-name.vo.js';
import type { ProvisionDefaultEnvironmentsPort } from '../../ports/input/provision-default-environments.port.js';

/** Runs inside the transaction that creates the project. */
export class ProvisionDefaultEnvironmentsUseCase implements ProvisionDefaultEnvironmentsPort {
  constructor(
    private readonly environments: EnvironmentRepository,
    private readonly events: DomainEventPublisher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ projectId, actor }: Parameters<ProvisionDefaultEnvironmentsPort['execute']>[0]): Promise<void> {
    for (const name of EnvironmentName.all()) {
      const environment = Environment.create({ id: this.ids.next(), projectId, name, now: this.clock.now() });
      await this.environments.add(environment);
      await this.events.publish(environment.pullEvents(), actor);
    }
  }
}
