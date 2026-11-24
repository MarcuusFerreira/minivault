import type { Environment } from '../entities/environment.entity.js';
import type { EnvironmentName } from '../value-objects/environment-name.vo.js';

export interface EnvironmentRepository {
  /** @throws EnvironmentExistsError */
  add(environment: Environment): Promise<void>;
  /** False when the environment no longer exists. */
  remove(environment: Environment): Promise<boolean>;
  find(projectId: string, id: string): Promise<Environment | null>;
  findByName(projectId: string, name: EnvironmentName): Promise<Environment | null>;
  listByProject(projectId: string): Promise<Environment[]>;
}
export const ENVIRONMENT_REPOSITORY = Symbol('EnvironmentRepository');
