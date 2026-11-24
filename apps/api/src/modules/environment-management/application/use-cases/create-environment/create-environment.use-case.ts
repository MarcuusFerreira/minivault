import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import { Environment } from '../../../domain/entities/environment.entity.js';
import type { EnvironmentRepository } from '../../../domain/repositories/environment.repository.js';
import { EnvironmentName } from '../../../domain/value-objects/environment-name.vo.js';
import { type EnvironmentView, toEnvironmentView } from '../../dto/environment-view.js';
import type { CreateEnvironmentPort } from '../../ports/input/create-environment.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';

export class CreateEnvironmentUseCase implements CreateEnvironmentPort {
  constructor(
    private readonly environments: EnvironmentRepository,
    private readonly access: ProjectAccess,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ context, projectId, name }: Parameters<CreateEnvironmentPort['execute']>[0]): Promise<EnvironmentView> {
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    const environment = Environment.create({
      id: this.ids.next(),
      projectId,
      name: EnvironmentName.create(name),
      now: this.clock.now(),
    });
    await this.unitOfWork.run(async () => {
      await this.environments.add(environment);
      await this.events.publish(environment.pullEvents(), actorOf(context));
    });
    return toEnvironmentView(environment);
  }
}
