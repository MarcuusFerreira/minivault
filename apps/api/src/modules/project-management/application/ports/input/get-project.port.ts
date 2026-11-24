import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { ProjectView } from '../../dto/project-view.js';

export interface GetProjectQuery {
  context: RequestContext;
  projectId: string;
}
export interface GetProjectPort {
  execute(input: GetProjectQuery): Promise<ProjectView>;
}
export const GET_PROJECT = Symbol('GetProjectPort');
