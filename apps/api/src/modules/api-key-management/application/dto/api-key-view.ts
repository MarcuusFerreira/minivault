import type { Grant } from '../../../../shared/domain/principal.js';
import type { ApiKey, ApiKeyStatus } from '../../domain/entities/api-key.entity.js';

export interface ApiKeyView {
  id: string;
  name: string;
  prefix: string;
  status: ApiKeyStatus;
  grants: readonly Grant[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}
export type IssuedApiKeyView = ApiKeyView & { plaintext: string };

export function toApiKeyView(key: ApiKey, now: Date): ApiKeyView {
  const { id, name, prefix, grants, expiresAt, lastUsedAt, revokedAt, createdAt } = key;
  return { id, name, prefix, status: key.statusAt(now), grants, expiresAt, lastUsedAt, revokedAt, createdAt };
}
