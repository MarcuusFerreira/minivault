import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { EnvironmentView } from '../../dto/environment-view.js';

export interface GetEnvironmentPort {
  execute(input: { context: RequestContext; projectId: string; environmentId: string }): Promise<EnvironmentView>;
}
export const GET_ENVIRONMENT = Symbol('GetEnvironmentPort');
