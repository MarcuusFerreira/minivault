import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import { ApiKeyAlreadyRevokedError } from '../../../domain/exceptions/api-key.errors.js';
import type { ApiKeyRepository } from '../../../domain/repositories/api-key.repository.js';
import { apiKeyNotFound } from '../../api-key-not-found.js';
import type { RevokeApiKeyInput, RevokeApiKeyPort } from '../../ports/input/revoke-api-key.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';

export class RevokeApiKeyUseCase implements RevokeApiKeyPort {
  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly access: ProjectAccess,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute({ context, projectId, apiKeyId }: RevokeApiKeyInput): Promise<void> {
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    const key = await this.keys.findById(projectId, apiKeyId);
    if (!key) throw apiKeyNotFound();
    key.revoke(this.clock.now());
    await this.unitOfWork.run(async () => {
      if (!(await this.keys.revoke(key))) throw new ApiKeyAlreadyRevokedError();
      await this.events.publish(key.pullEvents(), actorOf(context));
    });
  }
}
