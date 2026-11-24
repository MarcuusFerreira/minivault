import { z } from 'zod';

export const AUDIT_ACTIONS = [
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_DELETED',
  'ENVIRONMENT_CREATED',
  'ENVIRONMENT_DELETED',
  'SECRET_CREATED',
  'SECRET_UPDATED',
  'SECRET_ACCESSED',
  'SECRET_DELETED',
  'API_KEY_CREATED',
  'API_KEY_REVOKED',
] as const;
export const auditAction = z.enum(AUDIT_ACTIONS);
export type AuditActionValue = z.infer<typeof auditAction>;

export const auditLogQuery = z.strictObject({
  projectId: z
    .uuid()
    .transform((v) => v.toLowerCase())
    .optional(),
  action: auditAction.optional(),
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type AuditLogQuery = z.infer<typeof auditLogQuery>;

export interface AuditLogResponse {
  id: string;
  action: AuditActionValue;
  actor: { type: 'user' | 'apiKey'; id: string };
  projectId: string;
  environmentId: string | null;
  resourceType: 'PROJECT' | 'ENVIRONMENT' | 'SECRET' | 'API_KEY';
  resourceId: string;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogResponse[];
  nextCursor: string | null;
}
