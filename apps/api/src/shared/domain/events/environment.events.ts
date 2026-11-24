import type { DomainEvent } from '../domain-event.js';

abstract class EnvironmentEvent implements DomainEvent {
  abstract readonly name: string;
  constructor(
    readonly projectId: string,
    readonly environmentId: string,
    readonly environmentName: string,
    readonly occurredAt: Date,
  ) {}
}

export class EnvironmentCreated extends EnvironmentEvent {
  static readonly NAME = 'EnvironmentCreated';
  readonly name = EnvironmentCreated.NAME;
}

export class EnvironmentDeleted extends EnvironmentEvent {
  static readonly NAME = 'EnvironmentDeleted';
  readonly name = EnvironmentDeleted.NAME;
}
