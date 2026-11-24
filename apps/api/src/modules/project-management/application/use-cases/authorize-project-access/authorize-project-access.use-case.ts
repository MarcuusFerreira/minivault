import type { Principal } from '../../../../../shared/domain/principal.js';
import type { ProjectRepository } from '../../../domain/repositories/project.repository.js';
import type { AuthorizeProjectAccessPort } from '../../ports/input/authorize-project-access.port.js';
import { ownedProject, projectNotFound } from '../../project-not-found.js';

export class AuthorizeProjectAccessUseCase implements AuthorizeProjectAccessPort {
  constructor(private readonly projects: ProjectRepository) {}

  async execute({ principal, projectId }: { principal: Principal; projectId: string }): Promise<void> {
    if (principal.kind === 'user') {
      await ownedProject(this.projects, projectId, principal.userId);
      return;
    }
    if (principal.projectId !== projectId || !(await this.projects.findById(projectId))) throw projectNotFound();
  }
}
