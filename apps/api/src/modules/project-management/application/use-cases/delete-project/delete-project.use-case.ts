import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import type { ProjectRepository } from '../../../domain/repositories/project.repository.js';
import type { DeleteProjectCommand, DeleteProjectPort } from '../../ports/input/delete-project.port.js';
import { ownedProject, projectNotFound } from '../../project-not-found.js';

export class DeleteProjectUseCase implements DeleteProjectPort {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: DeleteProjectCommand): Promise<void> {
    const project = await ownedProject(this.projects, command.projectId, requireUser(command.context));
    project.markDeleted(this.clock.now());
    await this.unitOfWork.run(async () => {
      if (!(await this.projects.remove(project))) throw projectNotFound();
      await this.events.publish(project.pullEvents(), actorOf(command.context));
    });
  }
}
