import type { DomainEvent } from '../domain-event.js';

abstract class SecretEvent implements DomainEvent {
  abstract readonly name: string;
  constructor(
    readonly projectId: string,
    readonly environmentId: string,
    readonly secretId: string,
    readonly key: string,
    readonly occurredAt: Date,
  ) {}
}

export class SecretCreated extends SecretEvent {
  static readonly NAME = 'SecretCreated';
  readonly name = SecretCreated.NAME;
}

export class SecretUpdated extends SecretEvent {
  static readonly NAME = 'SecretUpdated';
  readonly name = SecretUpdated.NAME;
}

export class SecretAccessed extends SecretEvent {
  static readonly NAME = 'SecretAccessed';
  readonly name = SecretAccessed.NAME;
}

export class SecretDeleted extends SecretEvent {
  static readonly NAME = 'SecretDeleted';
  readonly name = SecretDeleted.NAME;
}
