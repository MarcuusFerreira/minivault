import { requireUser } from '../../../../../shared/application/require-user.js';
import type { ProjectRepository } from '../../../domain/repositories/project.repository.js';
import { type ProjectView, toProjectView } from '../../dto/project-view.js';
import type { GetProjectPort, GetProjectQuery } from '../../ports/input/get-project.port.js';
import type { ProjectStatisticsQuery } from '../../ports/output/project-statistics.port.js';
import { ownedProject } from '../../project-not-found.js';

export class GetProjectUseCase implements GetProjectPort {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly statistics: ProjectStatisticsQuery,
  ) {}

  async execute(query: GetProjectQuery): Promise<ProjectView> {
    const userId = requireUser(query.context);
    const project = await ownedProject(this.projects, query.projectId, userId);
    return toProjectView(project, (await this.statistics.forOwner(userId)).get(project.id));
  }
}
