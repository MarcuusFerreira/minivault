import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { SecretScope } from '../../../domain/repositories/secret.repository.js';
import type { RevealedSecret } from '../../dto/secret-view.js';

export interface RetrieveSecretInput extends SecretScope {
  context: RequestContext;
  secretId: string;
}
export interface RetrieveSecretPort {
  execute(input: RetrieveSecretInput): Promise<RevealedSecret>;
}
export const RETRIEVE_SECRET = Symbol('RetrieveSecretPort');
