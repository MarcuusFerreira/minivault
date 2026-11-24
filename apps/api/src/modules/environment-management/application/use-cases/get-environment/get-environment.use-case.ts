import { requireUser } from '../../../../../shared/application/require-user.js';
import type { EnvironmentRepository } from '../../../domain/repositories/environment.repository.js';
import { type EnvironmentView, toEnvironmentView } from '../../dto/environment-view.js';
import { environmentNotFound } from '../../environment-not-found.js';
import type { GetEnvironmentPort } from '../../ports/input/get-environment.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';

export class GetEnvironmentUseCase implements GetEnvironmentPort {
  constructor(
    private readonly environments: EnvironmentRepository,
    private readonly access: ProjectAccess,
  ) {}

  async execute({ context, projectId, environmentId }: Parameters<GetEnvironmentPort['execute']>[0]): Promise<EnvironmentView> {
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    const environment = await this.environments.find(projectId, environmentId);
    if (!environment) throw environmentNotFound();
    return toEnvironmentView(environment);
  }
}
