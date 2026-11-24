import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import type { EnvironmentRepository } from '../../../domain/repositories/environment.repository.js';
import { environmentNotFound } from '../../environment-not-found.js';
import type { DeleteEnvironmentPort } from '../../ports/input/delete-environment.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';

/** Also deletes the environment's secrets and API key grants. */
export class DeleteEnvironmentUseCase implements DeleteEnvironmentPort {
  constructor(
    private readonly environments: EnvironmentRepository,
    private readonly access: ProjectAccess,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute({ context, projectId, environmentId }: Parameters<DeleteEnvironmentPort['execute']>[0]): Promise<void> {
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    const environment = await this.environments.find(projectId, environmentId);
    if (!environment) throw environmentNotFound();
    environment.markDeleted(this.clock.now());
    await this.unitOfWork.run(async () => {
      if (!(await this.environments.remove(environment))) throw environmentNotFound();
      await this.events.publish(environment.pullEvents(), actorOf(context));
    });
  }
}
