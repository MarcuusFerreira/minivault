import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import type { SecretRepository } from '../../../domain/repositories/secret.repository.js';
import { SecretValue } from '../../../domain/value-objects/secret-value.vo.js';
import { type SecretMetadata, toSecretMetadata } from '../../dto/secret-view.js';
import type { UpdateSecretInput, UpdateSecretPort } from '../../ports/input/update-secret.port.js';
import type { EncryptionPort } from '../../ports/output/encryption.port.js';
import { secretNotFound } from '../../secret-errors.js';
import type { SecretAccessPolicy } from '../../services/secret-access.policy.js';

export class UpdateSecretUseCase implements UpdateSecretPort {
  constructor(
    private readonly secrets: SecretRepository,
    private readonly encryption: EncryptionPort,
    private readonly policy: SecretAccessPolicy,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateSecretInput): Promise<SecretMetadata> {
    const { context, projectId, environmentId, secretId } = input;
    await this.policy.assert(context, input, 'SECRETS_WRITE');
    const plaintext = SecretValue.create(input.value);
    const secret = await this.secrets.findById(input, secretId);
    if (!secret) throw secretNotFound();
    const value = await this.encryption.encrypt({ projectId, environmentId, secretId }, plaintext.reveal());
    secret.replaceValue(value, this.clock.now());
    await this.unitOfWork.run(async () => {
      if (!(await this.secrets.save(secret))) throw secretNotFound();
      await this.events.publish(secret.pullEvents(), actorOf(context));
    });
    return toSecretMetadata(secret);
  }
}
