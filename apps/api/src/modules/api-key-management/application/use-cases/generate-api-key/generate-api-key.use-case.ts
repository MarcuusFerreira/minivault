import { ApplicationError } from '../../../../../shared/application/application-error.js';
import type { Clock } from '../../../../../shared/application/clock.js';
import type { DomainEventPublisher } from '../../../../../shared/application/domain-event-publisher.js';
import type { IdGenerator } from '../../../../../shared/application/id-generator.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import { actorOf } from '../../../../../shared/domain/principal.js';
import { ApiKey } from '../../../domain/entities/api-key.entity.js';
import type { ApiKeyRepository } from '../../../domain/repositories/api-key.repository.js';
import { type IssuedApiKeyView, toApiKeyView } from '../../dto/api-key-view.js';
import type { GenerateApiKeyInput, GenerateApiKeyPort } from '../../ports/input/generate-api-key.port.js';
import type { ApiKeyGenerator } from '../../ports/output/api-key-generator.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';
import type { ProjectEnvironments } from '../../ports/output/project-environments.port.js';

export class GenerateApiKeyUseCase implements GenerateApiKeyPort {
  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly generator: ApiKeyGenerator,
    private readonly access: ProjectAccess,
    private readonly environments: ProjectEnvironments,
    private readonly unitOfWork: UnitOfWork,
    private readonly events: DomainEventPublisher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: GenerateApiKeyInput): Promise<IssuedApiKeyView> {
    const { context, projectId, name, expiresAt, grants } = input;
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    for (const grant of grants) {
      if (!(await this.environments.exists(projectId, grant.environmentId))) {
        throw new ApplicationError('ENVIRONMENT_NOT_FOUND', 'not_found', 'Environment not found.');
      }
    }
    const now = this.clock.now();
    const { plaintext, hash, prefix } = this.generator.generate();
    const key = ApiKey.issue({ id: this.ids.next(), projectId, name, hash, prefix, grants, expiresAt, now });
    await this.unitOfWork.run(async () => {
      await this.keys.add(key);
      await this.events.publish(key.pullEvents(), actorOf(context));
    });
    return { ...toApiKeyView(key, now), plaintext };
  }
}
