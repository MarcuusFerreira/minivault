import type { Actor } from '../../../../shared/domain/principal.js';
import { AuditMetadata } from '../value-objects/audit-metadata.vo.js';

export type AuditAction =
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'ENVIRONMENT_CREATED'
  | 'ENVIRONMENT_DELETED'
  | 'SECRET_CREATED'
  | 'SECRET_UPDATED'
  | 'SECRET_ACCESSED'
  | 'SECRET_DELETED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED';
export type AuditResourceType = 'PROJECT' | 'ENVIRONMENT' | 'SECRET' | 'API_KEY';

export interface AuditEntryState {
  id: string;
  /** Null for machine operations, whose API key is in the metadata. */
  userId: string | null;
  projectId: string;
  environmentId: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  ipAddress: string | null;
  metadata: AuditMetadata;
  createdAt: Date;
}

/** Immutable: entries are appended, never changed. */
export class AuditEntry {
  private constructor(readonly state: Readonly<AuditEntryState>) {}

  static record(
    input: Omit<AuditEntryState, 'userId' | 'ipAddress' | 'metadata'> & { actor: Actor; metadata: Record<string, unknown> },
  ): AuditEntry {
    const { actor, metadata, ...rest } = input;
    const actingKey = actor.apiKeyId === null ? {} : { apiKeyId: actor.apiKeyId };
    return new AuditEntry({
      ...rest,
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      metadata: AuditMetadata.create({ ...metadata, ...actingKey }),
    });
  }

  static restore(state: AuditEntryState): AuditEntry {
    return new AuditEntry(state);
  }
}
