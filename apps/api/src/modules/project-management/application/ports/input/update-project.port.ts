import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { ProjectView } from '../../dto/project-view.js';

export interface UpdateProjectCommand {
  context: RequestContext;
  projectId: string;
  name?: string | undefined;
  description?: string | undefined;
}
export interface UpdateProjectPort {
  execute(input: UpdateProjectCommand): Promise<ProjectView>;
}
export const UPDATE_PROJECT = Symbol('UpdateProjectPort');
