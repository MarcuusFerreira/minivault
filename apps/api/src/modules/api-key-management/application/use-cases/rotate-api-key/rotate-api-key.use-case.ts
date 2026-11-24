import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import { ApiKeyNotActiveError } from '../../../domain/exceptions/api-key.errors.js';
import type { ApiKeyRepository } from '../../../domain/repositories/api-key.repository.js';
import { apiKeyNotFound } from '../../api-key-not-found.js';
import { type IssuedApiKeyView, toApiKeyView } from '../../dto/api-key-view.js';
import type { RotateApiKeyInput, RotateApiKeyPort } from '../../ports/input/rotate-api-key.port.js';
import type { ApiKeyGenerator } from '../../ports/output/api-key-generator.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';

export class RotateApiKeyUseCase implements RotateApiKeyPort {
  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly generator: ApiKeyGenerator,
    private readonly access: ProjectAccess,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute({ context, projectId, apiKeyId }: RotateApiKeyInput): Promise<IssuedApiKeyView> {
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    const current = await this.keys.findById(projectId, apiKeyId);
    if (!current) throw apiKeyNotFound();
    const now = this.clock.now();
    const { plaintext, hash, prefix } = this.generator.generate();
    const successor = current.rotate({ id: this.ids.next(), hash, prefix }, now);
    await this.unitOfWork.run(async () => {
      // The conditional write decides between simultaneous rotations.
      if (!(await this.keys.revoke(current))) throw new ApiKeyNotActiveError();
      await this.keys.add(successor);
      await this.events.publish([...current.pullEvents(), ...successor.pullEvents()], actorOf(context));
    });
    return { ...toApiKeyView(successor, now), plaintext };
  }
}
