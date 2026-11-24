import type { Permission, RequestContext } from '../../../../shared/domain/principal.js';
import type { SecretScope } from '../../domain/repositories/secret.repository.js';
import type { EnvironmentDirectory } from '../ports/output/environment-directory.port.js';
import type { ProjectAccess } from '../ports/output/project-access.port.js';
import { environmentNotFound, permissionDenied } from '../secret-errors.js';

/** Single place that decides who may read or write the secrets of an environment. */
export class SecretAccessPolicy {
  constructor(
    private readonly projects: ProjectAccess,
    private readonly environments: EnvironmentDirectory,
  ) {}

  async assert({ principal }: RequestContext, scope: SecretScope, permission: Permission): Promise<void> {
    await this.projects.assert(principal, scope.projectId);
    if (!(await this.environments.byId(scope.projectId, scope.environmentId))) throw environmentNotFound();
    if (principal.kind === 'user') return;
    const granted = principal.grants.some(
      (grant) => grant.environmentId === scope.environmentId && grant.permissions.includes(permission),
    );
    if (!granted) throw permissionDenied();
  }
}
