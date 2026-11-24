import type { DomainEvent } from '../domain/domain-event.js';
import type { Actor } from '../domain/principal.js';

export interface DomainEventPublisher {
  /** Delivers events to subscribers within the caller's transaction. */
  publish(events: readonly DomainEvent[], actor: Actor): Promise<void>;
}
export const DOMAIN_EVENT_PUBLISHER = Symbol('DomainEventPublisher');

export interface DomainEventSubscriber {
  readonly handles: readonly string[];
  handle(event: DomainEvent, actor: Actor): Promise<void>;
}
