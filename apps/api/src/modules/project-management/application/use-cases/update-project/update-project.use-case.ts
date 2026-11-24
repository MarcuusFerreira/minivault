import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import type { ProjectRepository } from '../../../domain/repositories/project.repository.js';
import { ProjectName } from '../../../domain/value-objects/project-name.vo.js';
import { type ProjectView, toProjectView } from '../../dto/project-view.js';
import type { UpdateProjectCommand, UpdateProjectPort } from '../../ports/input/update-project.port.js';
import type { ProjectStatisticsQuery } from '../../ports/output/project-statistics.port.js';
import { ownedProject, projectNotFound } from '../../project-not-found.js';

export class UpdateProjectUseCase implements UpdateProjectPort {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly statistics: ProjectStatisticsQuery,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateProjectCommand): Promise<ProjectView> {
    const userId = requireUser(command.context);
    const project = await ownedProject(this.projects, command.projectId, userId);
    const name = command.name === undefined ? undefined : ProjectName.create(command.name);
    project.update({ name, description: command.description }, this.clock.now());
    await this.unitOfWork.run(async () => {
      if (!(await this.projects.save(project))) throw projectNotFound();
      await this.events.publish(project.pullEvents(), actorOf(command.context));
    });
    return toProjectView(project, (await this.statistics.forOwner(userId)).get(project.id));
  }
}
