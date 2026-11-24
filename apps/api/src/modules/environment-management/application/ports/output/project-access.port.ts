import type { Principal } from '../../../../../shared/domain/principal.js';

export interface ProjectAccess {
  /** Fails with PROJECT_NOT_FOUND unless the principal may act in the project. */
  assert(principal: Principal, projectId: string): Promise<void>;
}
export const PROJECT_ACCESS = Symbol('environment-management/ProjectAccess');
