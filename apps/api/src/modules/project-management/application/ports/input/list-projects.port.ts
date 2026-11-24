import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { ProjectView } from '../../dto/project-view.js';

export interface ListProjectsQuery {
  context: RequestContext;
}
export interface ListProjectsPort {
  execute(input: ListProjectsQuery): Promise<ProjectView[]>;
}
export const LIST_PROJECTS = Symbol('ListProjectsPort');
