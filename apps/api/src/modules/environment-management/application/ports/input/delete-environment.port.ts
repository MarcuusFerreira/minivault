import type { RequestContext } from '../../../../../shared/domain/principal.js';

export interface DeleteEnvironmentPort {
  execute(input: { context: RequestContext; projectId: string; environmentId: string }): Promise<void>;
}
export const DELETE_ENVIRONMENT = Symbol('DeleteEnvironmentPort');
