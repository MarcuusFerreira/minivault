import type { EnvironmentRepository } from '../../../domain/repositories/environment.repository.js';
import { EnvironmentName } from '../../../domain/value-objects/environment-name.vo.js';
import type { FindEnvironmentPort } from '../../ports/input/find-environment.port.js';

export class FindEnvironmentUseCase implements FindEnvironmentPort {
  constructor(private readonly environments: EnvironmentRepository) {}

  async byId(projectId: string, environmentId: string): Promise<{ id: string; name: string } | null> {
    const found = await this.environments.find(projectId, environmentId);
    return found && { id: found.id, name: found.name.value };
  }

  async byName(projectId: string, name: string): Promise<{ id: string; name: string } | null> {
    const found = await this.environments.findByName(projectId, EnvironmentName.create(name));
    return found && { id: found.id, name: found.name.value };
  }
}
