export interface OwnedProjects {
  idsOf(userId: string): Promise<string[]>;
}
export const OWNED_PROJECTS = Symbol('audit-management/OwnedProjects');
