import type { DomainEvent } from '../domain-event.js';
import type { Grant } from '../principal.js';

abstract class ApiKeyEvent implements DomainEvent {
  abstract readonly name: string;
  constructor(
    readonly projectId: string,
    readonly apiKeyId: string,
    readonly keyName: string,
    readonly prefix: string,
    readonly grants: readonly Grant[],
    readonly occurredAt: Date,
  ) {}
}

export class ApiKeyCreated extends ApiKeyEvent {
  static readonly NAME = 'ApiKeyCreated';
  readonly name = ApiKeyCreated.NAME;
}

export class ApiKeyRevoked extends ApiKeyEvent {
  static readonly NAME = 'ApiKeyRevoked';
  readonly name = ApiKeyRevoked.NAME;
}
