import type { Clock } from '../../../../../shared/application/clock.js';
import type { ApiKeyPrincipal } from '../../../../../shared/domain/principal.js';
import type { ApiKey } from '../../../domain/entities/api-key.entity.js';
import type { ApiKeyRepository } from '../../../domain/repositories/api-key.repository.js';
import type { AuthenticateApiKeyPort } from '../../ports/input/authenticate-api-key.port.js';
import type { ApiKeyGenerator } from '../../ports/output/api-key-generator.port.js';

const USAGE_RESOLUTION_MS = 60_000;

export class AuthenticateApiKeyUseCase implements AuthenticateApiKeyPort {
  constructor(
    private readonly keys: ApiKeyRepository,
    private readonly generator: ApiKeyGenerator,
    private readonly clock: Clock,
  ) {}

  async authenticate(plaintext: string): Promise<ApiKeyPrincipal | null> {
    const hash = this.generator.hash(plaintext);
    const key = hash === null ? null : await this.keys.findByHash(hash);
    const now = this.clock.now();
    if (!key?.isUsable(now)) return null;
    await this.recordUsage(key, now);
    return { kind: 'apiKey', apiKeyId: key.id, projectId: key.projectId, grants: key.grants };
  }

  /** Informational only: failing to record usage must not block a deployment. */
  private async recordUsage(key: ApiKey, now: Date): Promise<void> {
    if (key.lastUsedAt && now.getTime() - key.lastUsedAt.getTime() < USAGE_RESOLUTION_MS) return;
    await this.keys.touchLastUsed(key.id, now).catch(() => undefined);
  }
}
