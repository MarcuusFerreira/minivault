import { requireUser } from '../../../../../shared/application/require-user.js';
import type { EnvironmentRepository } from '../../../domain/repositories/environment.repository.js';
import { type EnvironmentView, toEnvironmentView } from '../../dto/environment-view.js';
import type { ListEnvironmentsPort } from '../../ports/input/list-environments.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';

export class ListEnvironmentsUseCase implements ListEnvironmentsPort {
  constructor(
    private readonly environments: EnvironmentRepository,
    private readonly access: ProjectAccess,
  ) {}

  async execute({ context, projectId }: Parameters<ListEnvironmentsPort['execute']>[0]): Promise<EnvironmentView[]> {
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    const environments = await this.environments.listByProject(projectId);
    return environments.sort((a, b) => a.name.order - b.name.order).map(toEnvironmentView);
  }
}
