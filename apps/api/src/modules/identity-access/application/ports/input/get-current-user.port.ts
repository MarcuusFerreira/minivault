import type { UserView } from '../../dto/user-view.js';

export interface GetCurrentUserPort {
  execute(userId: string): Promise<UserView>;
}
export const GET_CURRENT_USER = Symbol('GetCurrentUserPort');
