import { z } from 'zod';

export const PERMISSIONS = ['SECRETS_READ', 'SECRETS_WRITE'] as const;
export const permission = z.enum(PERMISSIONS);
export type PermissionValue = z.infer<typeof permission>;

export const apiKeyGrant = z.strictObject({
  environmentId: z.uuid().transform((v) => v.toLowerCase()),
  permissions: z.array(permission).min(1).max(PERMISSIONS.length),
});

export const createApiKeyRequest = z.strictObject({
  name: z.string().trim().min(1).max(100),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
  grants: z.array(apiKeyGrant).min(1).max(3),
});
export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequest>;

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  status: 'active' | 'expired' | 'revoked';
  grants: { environmentId: string; permissions: PermissionValue[] }[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
/** The plaintext is returned once and cannot be recovered. */
export type CreatedApiKeyResponse = ApiKeyResponse & { plaintext: string };
