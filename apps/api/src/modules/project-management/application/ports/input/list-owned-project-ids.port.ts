export interface ListOwnedProjectIdsPort {
  execute(userId: string): Promise<string[]>;
}
export const LIST_OWNED_PROJECT_IDS = Symbol('ListOwnedProjectIdsPort');
