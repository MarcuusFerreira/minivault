import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import { Secret } from '../../../domain/entities/secret.entity.js';
import type { SecretRepository } from '../../../domain/repositories/secret.repository.js';
import { SecretKey } from '../../../domain/value-objects/secret-key.vo.js';
import { SecretValue } from '../../../domain/value-objects/secret-value.vo.js';
import { type SecretMetadata, toSecretMetadata } from '../../dto/secret-view.js';
import type { StoreSecretInput, StoreSecretPort } from '../../ports/input/store-secret.port.js';
import type { EncryptionPort } from '../../ports/output/encryption.port.js';
import type { SecretAccessPolicy } from '../../services/secret-access.policy.js';

export class StoreSecretUseCase implements StoreSecretPort {
  constructor(
    private readonly secrets: SecretRepository,
    private readonly encryption: EncryptionPort,
    private readonly policy: SecretAccessPolicy,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: StoreSecretInput): Promise<SecretMetadata> {
    const { context, projectId, environmentId } = input;
    await this.policy.assert(context, input, 'SECRETS_WRITE');
    const key = SecretKey.create(input.key);
    const plaintext = SecretValue.create(input.value);
    const id = this.ids.next();
    // Outside the transaction: a slow engine must not hold a database connection.
    const value = await this.encryption.encrypt({ projectId, environmentId, secretId: id }, plaintext.reveal());
    const secret = Secret.create({ id, projectId, environmentId, key, value, now: this.clock.now() });
    await this.unitOfWork.run(async () => {
      await this.secrets.add(secret);
      await this.events.publish(secret.pullEvents(), actorOf(context));
    });
    return toSecretMetadata(secret);
  }
}
