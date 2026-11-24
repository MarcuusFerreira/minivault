import { AuditMetadata } from './audit-metadata.vo.js';

describe('AuditMetadata', () => {
  it('accepts allow-listed fields', () => {
    expect(AuditMetadata.create({ key: 'DB_URL', apiKeyId: 'k' }).value).toEqual({ key: 'DB_URL', apiKeyId: 'k' });
  });
  it.each(['value', 'plaintext', 'secret', 'password', 'keyHash'])('rejects %s', (field) => {
    expect(() => AuditMetadata.create({ [field]: 'x' })).toThrow(expect.objectContaining({ code: 'AUDIT_METADATA_INVALID' }));
  });
});
