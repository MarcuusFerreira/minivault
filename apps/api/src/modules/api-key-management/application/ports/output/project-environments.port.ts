export interface ProjectEnvironments {
  exists(projectId: string, environmentId: string): Promise<boolean>;
}
export const PROJECT_ENVIRONMENTS = Symbol('api-key-management/ProjectEnvironments');
