import type { Secret } from '../entities/secret.entity.js';

/** Where a secret lives. Every lookup is scoped, so an id alone is never enough. */
export interface SecretScope {
  projectId: string;
  environmentId: string;
}

export interface SecretRepository {
  /** @throws SecretKeyTakenError */
  add(secret: Secret): Promise<void>;
  /** False when the secret no longer exists. */
  save(secret: Secret): Promise<boolean>;
  /** False when the secret no longer exists. */
  remove(secret: Secret): Promise<boolean>;
  findById(scope: SecretScope, id: string): Promise<Secret | null>;
  /** All secrets when keys is null, ordered by key. */
  findByKeys(scope: SecretScope, keys: readonly string[] | null, limit: number): Promise<Secret[]>;
  list(scope: SecretScope): Promise<Secret[]>;
}
export const SECRET_REPOSITORY = Symbol('SecretRepository');
