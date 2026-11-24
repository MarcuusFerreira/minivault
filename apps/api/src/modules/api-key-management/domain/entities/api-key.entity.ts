import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { ApiKeyCreated, ApiKeyRevoked } from '../../../../shared/domain/events/api-key.events.js';
import type { Grant } from '../../../../shared/domain/principal.js';
import { isStorableText } from '../../../../shared/domain/text.js';
import {
  ApiKeyAlreadyRevokedError,
  ApiKeyNotActiveError,
  InvalidApiKeyExpiryError,
  InvalidApiKeyNameError,
} from '../exceptions/api-key.errors.js';
import { EnvironmentGrants } from '../value-objects/environment-grants.vo.js';

export interface ApiKeyState {
  id: string;
  projectId: string;
  name: string;
  hash: string;
  prefix: string;
  grants: readonly Grant[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}
export type ApiKeyStatus = 'active' | 'expired' | 'revoked';

interface IssueInput {
  id: string;
  projectId: string;
  name: string;
  hash: string;
  prefix: string;
  grants: readonly Grant[];
  expiresAt: Date | null;
  now: Date;
}

/** Knows the hash of the key, never the key. */
export class ApiKey extends AggregateRoot {
  readonly #hash: string;

  private constructor(
    private state: Omit<ApiKeyState, 'hash' | 'grants'>,
    hash: string,
    private readonly environmentGrants: EnvironmentGrants,
  ) {
    super();
    this.#hash = hash;
  }

  static issue(input: IssueInput): ApiKey {
    const { now, hash, grants, ...rest } = input;
    const name = rest.name.trim();
    if (name.length < 1 || name.length > 100 || !isStorableText(name)) throw new InvalidApiKeyNameError();
    if (rest.expiresAt && !(rest.expiresAt.getTime() > now.getTime())) throw new InvalidApiKeyExpiryError();
    const key = new ApiKey({ ...rest, name, lastUsedAt: null, revokedAt: null, createdAt: now }, hash, EnvironmentGrants.create(grants));
    key.record(new ApiKeyCreated(...key.eventDetails(now)));
    return key;
  }

  static restore({ hash, grants, ...state }: ApiKeyState): ApiKey {
    return new ApiKey(state, hash, EnvironmentGrants.restore(grants));
  }

  get id(): string {
    return this.state.id;
  }
  get projectId(): string {
    return this.state.projectId;
  }
  get name(): string {
    return this.state.name;
  }
  get hash(): string {
    return this.#hash;
  }
  get prefix(): string {
    return this.state.prefix;
  }
  get grants(): readonly Grant[] {
    return this.environmentGrants.values;
  }
  get expiresAt(): Date | null {
    return this.state.expiresAt;
  }
  get lastUsedAt(): Date | null {
    return this.state.lastUsedAt;
  }
  get revokedAt(): Date | null {
    return this.state.revokedAt;
  }
  get createdAt(): Date {
    return this.state.createdAt;
  }

  statusAt(now: Date): ApiKeyStatus {
    if (this.revokedAt) return 'revoked';
    return this.expiresAt && this.expiresAt.getTime() <= now.getTime() ? 'expired' : 'active';
  }

  isUsable(now: Date): boolean {
    return this.statusAt(now) === 'active';
  }

  revoke(now: Date): void {
    if (this.revokedAt) throw new ApiKeyAlreadyRevokedError();
    this.state = { ...this.state, revokedAt: now };
    this.record(new ApiKeyRevoked(...this.eventDetails(now)));
  }

  /** Revokes this key and issues its successor with the same name, grants and expiry. */
  rotate(successor: { id: string; hash: string; prefix: string }, now: Date): ApiKey {
    if (!this.isUsable(now)) throw new ApiKeyNotActiveError();
    this.revoke(now);
    const { projectId, name, grants, expiresAt } = this;
    return ApiKey.issue({ ...successor, projectId, name, grants, expiresAt, now });
  }

  private eventDetails(now: Date): [string, string, string, string, readonly Grant[], Date] {
    return [this.projectId, this.id, this.name, this.prefix, this.grants, now];
  }
}
