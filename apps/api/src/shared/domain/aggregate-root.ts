import type { DomainEvent } from './domain-event.js';

export abstract class AggregateRoot {
  private events: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.events.push(event);
  }

  /** Returns the recorded events and forgets them. */
  pullEvents(): DomainEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}
