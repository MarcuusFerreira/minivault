export interface EnvironmentReference {
  id: string;
  name: string;
}

export interface EnvironmentDirectory {
  byId(projectId: string, environmentId: string): Promise<EnvironmentReference | null>;
  byName(projectId: string, name: string): Promise<EnvironmentReference | null>;
}
export const ENVIRONMENT_DIRECTORY = Symbol('secrets-management/EnvironmentDirectory');
