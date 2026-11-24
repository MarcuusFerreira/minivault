import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { EnvironmentView } from '../../dto/environment-view.js';

export interface CreateEnvironmentPort {
  execute(input: { context: RequestContext; projectId: string; name: string }): Promise<EnvironmentView>;
}
export const CREATE_ENVIRONMENT = Symbol('CreateEnvironmentPort');
