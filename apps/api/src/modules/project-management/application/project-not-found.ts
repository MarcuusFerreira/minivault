import { ApplicationError } from '../../../shared/application/application-error.js';
import type { Project } from '../domain/entities/project.entity.js';
import type { ProjectRepository } from '../domain/repositories/project.repository.js';

export const projectNotFound = () => new ApplicationError('PROJECT_NOT_FOUND', 'not_found', 'Project not found.');

/** A project that is not yours does not exist, so ids cannot be probed. */
export async function ownedProject(projects: ProjectRepository, projectId: string, userId: string): Promise<Project> {
  const project = await projects.findById(projectId);
  if (!project?.isOwnedBy(userId)) throw projectNotFound();
  return project;
}
