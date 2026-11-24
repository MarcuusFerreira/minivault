import type { ApiKey } from '../entities/api-key.entity.js';

export interface ApiKeyRepository {
  add(key: ApiKey): Promise<void>;
  /** Persists the revocation. False when the key was already revoked or is gone. */
  revoke(key: ApiKey): Promise<boolean>;
  findById(projectId: string, id: string): Promise<ApiKey | null>;
  findByHash(hash: string): Promise<ApiKey | null>;
  listByProject(projectId: string): Promise<ApiKey[]>;
  touchLastUsed(id: string, now: Date): Promise<void>;
}
export const API_KEY_REPOSITORY = Symbol('ApiKeyRepository');
