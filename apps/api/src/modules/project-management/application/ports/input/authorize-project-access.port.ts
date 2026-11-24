import type { Principal } from '../../../../../shared/domain/principal.js';

/** Used by other contexts. Fails with PROJECT_NOT_FOUND unless the principal may act in the project. */
export interface AuthorizeProjectAccessPort {
  execute(input: { principal: Principal; projectId: string }): Promise<void>;
}
export const AUTHORIZE_PROJECT_ACCESS = Symbol('AuthorizeProjectAccessPort');
