/** Used by other contexts. Performs no authorization. */
export interface FindEnvironmentPort {
  byId(projectId: string, environmentId: string): Promise<{ id: string; name: string } | null>;
  byName(projectId: string, name: string): Promise<{ id: string; name: string } | null>;
}
export const FIND_ENVIRONMENT = Symbol('FindEnvironmentPort');
