import type { RequestContext } from '../../../../../shared/domain/principal.js';


export interface DeleteProjectCommand {
  context: RequestContext;
  projectId: string;
}
export interface DeleteProjectPort {
  execute(input: DeleteProjectCommand): Promise<void>;
}
export const DELETE_PROJECT = Symbol('DeleteProjectPort');
