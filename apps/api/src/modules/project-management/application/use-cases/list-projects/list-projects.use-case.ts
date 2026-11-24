import { requireUser } from '../../../../../shared/application/require-user.js';
import type { ProjectRepository } from '../../../domain/repositories/project.repository.js';
import { type ProjectView, toProjectView } from '../../dto/project-view.js';
import type { ListProjectsPort, ListProjectsQuery } from '../../ports/input/list-projects.port.js';
import type { ProjectStatisticsQuery } from '../../ports/output/project-statistics.port.js';

export class ListProjectsUseCase implements ListProjectsPort {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly statistics: ProjectStatisticsQuery,
  ) {}

  async execute(query: ListProjectsQuery): Promise<ProjectView[]> {
    const userId = requireUser(query.context);
    const [projects, statistics] = await Promise.all([this.projects.listByOwner(userId), this.statistics.forOwner(userId)]);
    return projects.map((project) => toProjectView(project, statistics.get(project.id)));
  }
}
