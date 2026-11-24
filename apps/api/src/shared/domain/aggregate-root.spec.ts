import { AggregateRoot } from './aggregate-root.js';
import type { DomainEvent } from './domain-event.js';

class Thing extends AggregateRoot {
  happen(): void {
    this.record({ name: 'ThingHappened', occurredAt: new Date(0) });
  }
}

describe('AggregateRoot', () => {
  it('drains recorded events exactly once, in order', () => {
    const thing = new Thing();
    thing.happen();
    thing.happen();
    expect(thing.pullEvents().map((e: DomainEvent) => e.name)).toEqual(['ThingHappened', 'ThingHappened']);
    expect(thing.pullEvents()).toEqual([]);
  });
});
