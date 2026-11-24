import type { ProjectRepository } from '../../../domain/repositories/project.repository.js';
import type { ListOwnedProjectIdsPort } from '../../ports/input/list-owned-project-ids.port.js';

export class ListOwnedProjectIdsUseCase implements ListOwnedProjectIdsPort {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(userId: string): Promise<string[]> {
    return (await this.projects.listByOwner(userId)).map((project) => project.id);
  }
}
