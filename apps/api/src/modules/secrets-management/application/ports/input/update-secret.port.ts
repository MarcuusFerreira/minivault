import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { SecretScope } from '../../../domain/repositories/secret.repository.js';
import type { SecretMetadata } from '../../dto/secret-view.js';

export interface UpdateSecretInput extends SecretScope {
  context: RequestContext;
  secretId: string;
  value: string;
}
export interface UpdateSecretPort {
  execute(input: UpdateSecretInput): Promise<SecretMetadata>;
}
export const UPDATE_SECRET = Symbol('UpdateSecretPort');
