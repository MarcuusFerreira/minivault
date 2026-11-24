import { Injectable } from '@nestjs/common';
import type { DomainEventPublisher, DomainEventSubscriber } from '../../application/domain-event-publisher.js';
import type { DomainEvent } from '../../domain/domain-event.js';
import type { Actor } from '../../domain/principal.js';

/** Synchronous, so subscribers share the caller's transaction and can veto it by throwing. */
@Injectable()
export class InProcessEventBus implements DomainEventPublisher {
  private readonly subscribers: DomainEventSubscriber[] = [];

  subscribe(subscriber: DomainEventSubscriber): void {
    this.subscribers.push(subscriber);
  }

  async publish(events: readonly DomainEvent[], actor: Actor): Promise<void> {
    for (const event of events) {
      for (const subscriber of this.subscribers) {
        if (subscriber.handles.includes(event.name)) {
          await subscriber.handle(event, actor);
        }
      }
    }
  }
}
