import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { SecretScope } from '../../../domain/repositories/secret.repository.js';
import type { RevealedSecret } from '../../dto/secret-view.js';

export interface RetrieveSecretsInput extends SecretScope {
  context: RequestContext;
  /** All secrets when null. */
  keys: readonly string[] | null;
}
export interface RetrieveSecretsPort {
  execute(input: RetrieveSecretsInput): Promise<RevealedSecret[]>;
}
export const RETRIEVE_SECRETS = Symbol('RetrieveSecretsPort');
