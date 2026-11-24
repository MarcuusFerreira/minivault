import type { DomainEvent } from '../../domain/domain-event.js';
import { InProcessEventBus } from './in-process-event-bus.js';

const actor = { userId: 'u', apiKeyId: null, ipAddress: null };
const event = (name: string): DomainEvent => ({ name, occurredAt: new Date(0) });

describe('InProcessEventBus', () => {
  it('awaits subscribers one after another, in registration order', async () => {
    const bus = new InProcessEventBus();
    const seen: string[] = [];
    bus.subscribe({
      handles: ['A'],
      handle: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        seen.push('slow');
      },
    });
    bus.subscribe({ handles: ['A'], handle: async () => void seen.push('fast') });
    await bus.publish([event('A')], actor);
    expect(seen).toEqual(['slow', 'fast']);
  });

  it('delivers only the event names a subscriber handles', async () => {
    const bus = new InProcessEventBus();
    const seen: string[] = [];
    bus.subscribe({ handles: ['B'], handle: async (e) => void seen.push(e.name) });
    await bus.publish([event('A'), event('B')], actor);
    expect(seen).toEqual(['B']);
  });

  it('propagates a subscriber failure so the transaction rolls back', async () => {
    const bus = new InProcessEventBus();
    bus.subscribe({ handles: ['A'], handle: () => Promise.reject(new Error('audit down')) });
    await expect(bus.publish([event('A')], actor)).rejects.toThrow('audit down');
  });
});
