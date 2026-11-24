import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { ProjectView } from '../../dto/project-view.js';

export interface CreateProjectCommand {
  context: RequestContext;
  name: string;
  description: string;
}
export interface CreateProjectPort {
  execute(input: CreateProjectCommand): Promise<ProjectView>;
}
export const CREATE_PROJECT = Symbol('CreateProjectPort');
