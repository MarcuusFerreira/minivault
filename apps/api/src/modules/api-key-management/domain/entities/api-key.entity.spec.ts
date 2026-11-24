import type { Permission } from '../../../../shared/domain/principal.js';
import { ApiKey } from './api-key.entity.js';

const now = new Date('2030-01-01T00:00:00Z');
const at = (seconds: number) => new Date(now.getTime() + seconds * 1000);
const grant = (environmentId: string, ...permissions: Permission[]) => ({ environmentId, permissions });
const issue = (overrides: Partial<Parameters<typeof ApiKey.issue>[0]> = {}) =>
  ApiKey.issue({ id: 'k', projectId: 'p', name: 'CI', hash: 'h', prefix: 'mv_12345678', grants: [grant('e', 'SECRETS_READ')], expiresAt: at(60), now, ...overrides });

describe('ApiKey', () => {
  it.each([
    ['no grants', { grants: [] }],
    ['a repeated environment', { grants: [grant('e', 'SECRETS_READ'), grant('e', 'SECRETS_WRITE')] }],
    ['a grant without permissions', { grants: [grant('e')] }],
    ['a repeated permission', { grants: [grant('e', 'SECRETS_READ', 'SECRETS_READ')] }],
  ])('cannot be issued with %s', (_name, overrides) => {
    expect(() => issue(overrides)).toThrow(expect.objectContaining({ code: 'API_KEY_GRANTS_INVALID' }));
  });
  it.each([at(0), at(-1), new Date('nonsense')])('cannot expire at %s', (expiresAt) => {
    expect(() => issue({ expiresAt })).toThrow(expect.objectContaining({ code: 'API_KEY_EXPIRY_INVALID' }));
  });
  it('rejects a blank name', () => {
    expect(() => issue({ name: '  ' })).toThrow(expect.objectContaining({ code: 'API_KEY_NAME_INVALID' }));
  });
  it('is usable until the instant it expires', () => {
    expect(issue().isUsable(at(59.999))).toBe(true);
    expect(issue().isUsable(at(60))).toBe(false);
    expect(issue({ expiresAt: null }).isUsable(at(1e9))).toBe(true);
  });
  it('is revoked once and for all', () => {
    const key = issue({ expiresAt: null });
    key.revoke(at(1));
    expect(key.isUsable(at(2))).toBe(false);
    expect(key.statusAt(at(2))).toBe('revoked');
    expect(() => key.revoke(at(3))).toThrow(expect.objectContaining({ code: 'API_KEY_ALREADY_REVOKED' }));
    expect(key.revokedAt).toEqual(at(1));
  });
  it('reports its events without the hash', () => {
    const key = issue();
    key.revoke(at(1));
    const events = key.pullEvents();
    expect(events.map((e) => e.name)).toEqual(['ApiKeyCreated', 'ApiKeyRevoked']);
    expect(JSON.stringify(events)).not.toContain('"h"');
    expect(JSON.stringify(key)).not.toContain('"h"');
  });
});
