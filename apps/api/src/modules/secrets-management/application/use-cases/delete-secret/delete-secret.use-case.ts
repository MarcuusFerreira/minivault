import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import type { SecretRepository } from '../../../domain/repositories/secret.repository.js';
import type { DeleteSecretInput, DeleteSecretPort } from '../../ports/input/delete-secret.port.js';
import { secretNotFound } from '../../secret-errors.js';
import type { SecretAccessPolicy } from '../../services/secret-access.policy.js';

export class DeleteSecretUseCase implements DeleteSecretPort {
  constructor(
    private readonly secrets: SecretRepository,
    private readonly policy: SecretAccessPolicy,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(input: DeleteSecretInput): Promise<void> {
    const { context, secretId } = input;
    await this.policy.assert(context, input, 'SECRETS_WRITE');
    const secret = await this.secrets.findById(input, secretId);
    if (!secret) throw secretNotFound();
    secret.markDeleted(this.clock.now());
    await this.unitOfWork.run(async () => {
      if (!(await this.secrets.remove(secret))) throw secretNotFound();
      await this.events.publish(secret.pullEvents(), actorOf(context));
    });
  }
}
