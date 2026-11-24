import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { SecretScope } from '../../../domain/repositories/secret.repository.js';
import type { SecretMetadata } from '../../dto/secret-view.js';

export interface StoreSecretInput extends SecretScope {
  context: RequestContext;
  key: string;
  value: string;
}
export interface StoreSecretPort {
  execute(input: StoreSecretInput): Promise<SecretMetadata>;
}
export const STORE_SECRET = Symbol('StoreSecretPort');
