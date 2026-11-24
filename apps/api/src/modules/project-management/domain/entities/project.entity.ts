import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { ProjectCreated, ProjectDeleted, ProjectUpdated } from '../../../../shared/domain/events/project.events.js';
import { isStorableText } from '../../../../shared/domain/text.js';
import { InvalidProjectDescriptionError } from '../exceptions/project.errors.js';
import { ProjectName } from '../value-objects/project-name.vo.js';

export interface ProjectState {
  id: string;
  name: ProjectName;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Project extends AggregateRoot {
  private constructor(private state: ProjectState) {
    super();
  }

  static create(input: { id: string; name: ProjectName; description: string; ownerId: string; now: Date }): Project {
    const { now, ...rest } = input;
    const project = new Project({ ...rest, description: validDescription(rest.description), createdAt: now, updatedAt: now });
    project.record(new ProjectCreated(project.id, project.ownerId, project.name.value, now));
    return project;
  }

  static restore(state: ProjectState): Project {
    return new Project(state);
  }

  get id(): string {
    return this.state.id;
  }
  get name(): ProjectName {
    return this.state.name;
  }
  get description(): string {
    return this.state.description;
  }
  get ownerId(): string {
    return this.state.ownerId;
  }
  get createdAt(): Date {
    return this.state.createdAt;
  }
  get updatedAt(): Date {
    return this.state.updatedAt;
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  update(changes: { name?: ProjectName | undefined; description?: string | undefined }, now: Date): void {
    this.state = {
      ...this.state,
      name: changes.name ?? this.name,
      description: changes.description === undefined ? this.description : validDescription(changes.description),
      updatedAt: now,
    };
    this.record(new ProjectUpdated(this.id, this.ownerId, this.name.value, now));
  }

  markDeleted(now: Date): void {
    this.record(new ProjectDeleted(this.id, this.ownerId, this.name.value, now));
  }
}

function validDescription(raw: string): string {
  const value = raw.trim();
  if (value.length > 500 || !isStorableText(value)) throw new InvalidProjectDescriptionError();
  return value;
}
