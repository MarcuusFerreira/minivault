import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { EnvironmentView } from '../../dto/environment-view.js';

export interface ListEnvironmentsPort {
  execute(input: { context: RequestContext; projectId: string }): Promise<EnvironmentView[]>;
}
export const LIST_ENVIRONMENTS = Symbol('ListEnvironmentsPort');
