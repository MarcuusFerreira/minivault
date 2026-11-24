import type { RequestContext } from '../../../../../shared/domain/principal.js';
import type { SecretScope } from '../../../domain/repositories/secret.repository.js';
import type { SecretMetadata } from '../../dto/secret-view.js';

export interface ListSecretMetadataInput extends SecretScope {
  context: RequestContext;
}
export interface ListSecretMetadataPort {
  execute(input: ListSecretMetadataInput): Promise<SecretMetadata[]>;
}
export const LIST_SECRET_METADATA = Symbol('ListSecretMetadataPort');
