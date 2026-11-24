import type { DomainEvent } from '../domain-event.js';

abstract class ProjectEvent implements DomainEvent {
  abstract readonly name: string;
  constructor(
    readonly projectId: string,
    readonly ownerId: string,
    readonly projectName: string,
    readonly occurredAt: Date,
  ) {}
}

export class ProjectCreated extends ProjectEvent {
  static readonly NAME = 'ProjectCreated';
  readonly name = ProjectCreated.NAME;
}

export class ProjectUpdated extends ProjectEvent {
  static readonly NAME = 'ProjectUpdated';
  readonly name = ProjectUpdated.NAME;
}

export class ProjectDeleted extends ProjectEvent {
  static readonly NAME = 'ProjectDeleted';
  readonly name = ProjectDeleted.NAME;
}
