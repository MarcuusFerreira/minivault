import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { EnvironmentCreated, EnvironmentDeleted } from '../../../../shared/domain/events/environment.events.js';
import { EnvironmentName } from '../value-objects/environment-name.vo.js';

export class Environment extends AggregateRoot {
  private constructor(
    readonly id: string,
    readonly projectId: string,
    readonly name: EnvironmentName,
    readonly createdAt: Date,
  ) {
    super();
  }

  static create(input: { id: string; projectId: string; name: EnvironmentName; now: Date }): Environment {
    const environment = new Environment(input.id, input.projectId, input.name, input.now);
    environment.record(new EnvironmentCreated(input.projectId, input.id, input.name.value, input.now));
    return environment;
  }

  static restore(state: { id: string; projectId: string; name: EnvironmentName; createdAt: Date }): Environment {
    return new Environment(state.id, state.projectId, state.name, state.createdAt);
  }

  markDeleted(now: Date): void {
    this.record(new EnvironmentDeleted(this.projectId, this.id, this.name.value, now));
  }
}
