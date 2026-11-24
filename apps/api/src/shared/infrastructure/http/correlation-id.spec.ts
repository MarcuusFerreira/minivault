import { resolveCorrelationId } from './correlation-id.middleware.js';

describe('resolveCorrelationId', () => {
  it('keeps a well-formed inbound id', () => {
    expect(resolveCorrelationId('abc-12345')).toBe('abc-12345');
  });

  it.each([undefined, 'short', 'x'.repeat(65), 'has space in it', 'new\nline-injected', ['a-valid-id-1', 'b']])(
    'replaces %j with a UUID',
    (inbound) => {
      expect(resolveCorrelationId(inbound)).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/);
    },
  );
});
