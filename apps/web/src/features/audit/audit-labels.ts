import type { AuditActionValue, AuditLogResponse } from '@minivault/contracts';

export const ACTION_LABELS: Record<AuditActionValue, string> = {
  PROJECT_CREATED: 'Project created',
  PROJECT_UPDATED: 'Project updated',
  PROJECT_DELETED: 'Project deleted',
  ENVIRONMENT_CREATED: 'Environment created',
  ENVIRONMENT_DELETED: 'Environment deleted',
  SECRET_CREATED: 'Secret created',
  SECRET_UPDATED: 'Secret updated',
  SECRET_ACCESSED: 'Secret accessed',
  SECRET_DELETED: 'Secret deleted',
  API_KEY_CREATED: 'API key created',
  API_KEY_REVOKED: 'API key revoked',
};

export function subjectOf({ metadata }: AuditLogResponse): string {
  const subject = metadata.key ?? metadata.environmentName ?? metadata.name;
  return typeof subject === 'string' ? subject : '';
}
