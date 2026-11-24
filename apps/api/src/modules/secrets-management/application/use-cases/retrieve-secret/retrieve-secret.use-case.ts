import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import type { SecretRepository } from '../../../domain/repositories/secret.repository.js';
import { type RevealedSecret, toSecretMetadata } from '../../dto/secret-view.js';
import type { RetrieveSecretInput, RetrieveSecretPort } from '../../ports/input/retrieve-secret.port.js';
import type { EncryptionPort } from '../../ports/output/encryption.port.js';
import { secretNotFound } from '../../secret-errors.js';
import type { SecretAccessPolicy } from '../../services/secret-access.policy.js';

/** An access that cannot be audited returns nothing. */
export class RetrieveSecretUseCase implements RetrieveSecretPort {
  constructor(
    private readonly secrets: SecretRepository,
    private readonly encryption: EncryptionPort,
    private readonly policy: SecretAccessPolicy,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(input: RetrieveSecretInput): Promise<RevealedSecret> {
    const { context, projectId, environmentId, secretId } = input;
    await this.policy.assert(context, input, 'SECRETS_READ');
    const secret = await this.secrets.findById(input, secretId);
    if (!secret) throw secretNotFound();
    const value = await this.encryption.decrypt({ projectId, environmentId, secretId }, secret.encryptedValue);
    secret.recordAccess(this.clock.now());
    await this.unitOfWork.run(() => this.events.publish(secret.pullEvents(), actorOf(context)));
    return { ...toSecretMetadata(secret), value };
  }
}
