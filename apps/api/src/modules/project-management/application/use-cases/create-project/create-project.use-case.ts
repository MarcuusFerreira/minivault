import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import { Project } from '../../../domain/entities/project.entity.js';
import type { ProjectRepository } from '../../../domain/repositories/project.repository.js';
import { ProjectName } from '../../../domain/value-objects/project-name.vo.js';
import { type ProjectView, toProjectView } from '../../dto/project-view.js';
import type { CreateProjectCommand, CreateProjectPort } from '../../ports/input/create-project.port.js';

export class CreateProjectUseCase implements CreateProjectPort {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateProjectCommand): Promise<ProjectView> {
    const project = Project.create({
      id: this.ids.next(),
      name: ProjectName.create(command.name),
      description: command.description,
      ownerId: requireUser(command.context),
      now: this.clock.now(),
    });
    await this.unitOfWork.run(async () => {
      await this.projects.add(project);
      await this.events.publish(project.pullEvents(), actorOf(command.context));
    });
    return toProjectView(project);
  }
}
