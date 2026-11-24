import { InvalidAuditMetadataError } from '../exceptions/audit.errors.js';

/** An allow-list: a new field must be judged harmless before it can be recorded. */
const ALLOWED = new Set(['key', 'name', 'environmentName', 'apiKeyId', 'apiKeyPrefix', 'grants']);

export class AuditMetadata {
  private constructor(readonly value: Readonly<Record<string, unknown>>) {}

  static create(value: Record<string, unknown>): AuditMetadata {
    if (Object.keys(value).some((field) => !ALLOWED.has(field))) throw new InvalidAuditMetadataError();
    return new AuditMetadata(Object.freeze({ ...value }));
  }
}
