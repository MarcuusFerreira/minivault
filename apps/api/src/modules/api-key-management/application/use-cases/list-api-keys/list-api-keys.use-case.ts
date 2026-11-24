import type { Clock } from '../../../../../shared/application/clock.js';
import { requireUser } from '../../../../../shared/application/require-user.js';
import type { ApiKeyRepository } from '../../../domain/repositories/api-key.repository.js';
import { type ApiKeyView, toApiKeyView } from '../../dto/api-key-view.js';
import type { ListApiKeysInput, ListApiKeysPort } from '../../ports/input/list-api-keys.port.js';
import type { ProjectAccess } from '../../ports/output/project-access.port.js';

export class ListApiKeysUseCase implements ListApiKeysPort {
  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly access: ProjectAccess,
    private readonly clock: Clock,
  ) {}

  async execute({ context, projectId }: ListApiKeysInput): Promise<ApiKeyView[]> {
    requireUser(context);
    await this.access.assert(context.principal, projectId);
    const now = this.clock.now();
    return (await this.keys.listByProject(projectId)).map((key) => toApiKeyView(key, now));
  }
}
