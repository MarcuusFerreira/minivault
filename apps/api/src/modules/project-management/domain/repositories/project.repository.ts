import type { Project } from '../entities/project.entity.js';

export interface ProjectRepository {
  /** @throws ProjectNameTakenError */
  add(project: Project): Promise<void>;
  /** False when the project no longer exists. */
  save(project: Project): Promise<boolean>;
  /** False when the project no longer exists. */
  remove(project: Project): Promise<boolean>;
  findById(id: string): Promise<Project | null>;
  listByOwner(ownerId: string): Promise<Project[]>;
}
export const PROJECT_REPOSITORY = Symbol('ProjectRepository');
