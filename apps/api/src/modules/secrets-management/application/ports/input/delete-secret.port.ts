import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { SecretScope } from '../../../domain/repositories/secret.repository.js';

export interface DeleteSecretInput extends SecretScope {
  context: RequestContext;
  secretId: string;
}
export interface DeleteSecretPort {
  execute(input: DeleteSecretInput): Promise<void>;
}
export const DELETE_SECRET = Symbol('DeleteSecretPort');
