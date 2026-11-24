import type { SecretRepository } from '../../../domain/repositories/secret.repository.js';
import { type SecretMetadata, toSecretMetadata } from '../../dto/secret-view.js';
import type { ListSecretMetadataInput, ListSecretMetadataPort } from '../../ports/input/list-secret-metadata.port.js';
import type { SecretAccessPolicy } from '../../services/secret-access.policy.js';

export class ListSecretMetadataUseCase implements ListSecretMetadataPort {
  constructor(
    private readonly secrets: SecretRepository,
    private readonly policy: SecretAccessPolicy,
  ) {}

  async execute(input: ListSecretMetadataInput): Promise<SecretMetadata[]> {
    await this.policy.assert(input.context, input, 'SECRETS_READ');
    return (await this.secrets.list(input)).map(toSecretMetadata);
  }
}
