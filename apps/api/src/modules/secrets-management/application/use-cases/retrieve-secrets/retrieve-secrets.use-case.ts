import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import type { Secret } from '../../../domain/entities/secret.entity.js';
import type { SecretRepository } from '../../../domain/repositories/secret.repository.js';
import { type RevealedSecret, toSecretMetadata } from '../../dto/secret-view.js';
import type { RetrieveSecretsInput, RetrieveSecretsPort } from '../../ports/input/retrieve-secrets.port.js';
import type { EncryptionPort } from '../../ports/output/encryption.port.js';
import { secretsNotFound, tooManySecrets } from '../../secret-errors.js';
import type { SecretAccessPolicy } from '../../services/secret-access.policy.js';

const LIMIT = 100;
const CONCURRENCY = 10;

/** All or nothing: a partial answer could start an application with missing configuration. */
export class RetrieveSecretsUseCase implements RetrieveSecretsPort {
  constructor(
    private readonly secrets: SecretRepository,
    private readonly encryption: EncryptionPort,
    private readonly policy: SecretAccessPolicy,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(input: RetrieveSecretsInput): Promise<RevealedSecret[]> {
    const { context } = input;
    await this.policy.assert(context, input, 'SECRETS_READ');
    const keys = input.keys && [...new Set(input.keys)];
    if (keys && keys.length > LIMIT) throw tooManySecrets(LIMIT);
    const secrets = await this.secrets.findByKeys(input, keys, LIMIT + 1);
    if (secrets.length > LIMIT) throw tooManySecrets(LIMIT);
    if (keys) {
      const found = new Set(secrets.map((secret) => secret.key.value));
      const missing = keys.filter((key) => !found.has(key));
      if (missing.length > 0) throw secretsNotFound(missing);
    }
    const values = await this.decryptAll(secrets);
    const now = this.clock.now();
    await this.unitOfWork.run(async () => {
      for (const secret of secrets) {
        secret.recordAccess(now);
        await this.events.publish(secret.pullEvents(), actorOf(context));
      }
    });
    return secrets.map((secret, index) => ({ ...toSecretMetadata(secret), value: values[index] ?? '' }));
  }

  private async decryptAll(secrets: readonly Secret[]): Promise<string[]> {
    const values: string[] = [];
    for (let start = 0; start < secrets.length; start += CONCURRENCY) {
      const batch = secrets.slice(start, start + CONCURRENCY).map(({ id, projectId, environmentId, encryptedValue }) =>
        this.encryption.decrypt({ projectId, environmentId, secretId: id }, encryptedValue),
      );
      values.push(...(await Promise.all(batch)));
    }
    return values;
  }
}
