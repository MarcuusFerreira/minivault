import type { ApiKey as ApiKeyRow, ApiKeyGrant as GrantRow } from '../../../../../../generated/prisma/client.js';
import type { Grant, Permission } from '../../../../../../shared/domain/principal.js';
import { ApiKey } from '../../../../domain/entities/api-key.entity.js';

export const apiKeyMapper = {
  toDomain: ({ keyHash, keyPrefix, grants, ...row }: ApiKeyRow & { grants: GrantRow[] }): ApiKey =>
    ApiKey.restore({ ...row, hash: keyHash, prefix: keyPrefix, grants: groupByEnvironment(grants) }),
  toRow: (key: ApiKey): ApiKeyRow => ({
    id: key.id,
    projectId: key.projectId,
    name: key.name,
    keyHash: key.hash,
    keyPrefix: key.prefix,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    revokedAt: key.revokedAt,
    createdAt: key.createdAt,
  }),
  toGrantRows: (key: ApiKey): GrantRow[] =>
    key.grants.flatMap(({ environmentId, permissions }) =>
      permissions.map((permission) => ({ apiKeyId: key.id, environmentId, permission })),
    ),
};

function groupByEnvironment(rows: GrantRow[]): Grant[] {
  const grouped = new Map<string, Permission[]>();
  for (const { environmentId, permission } of rows) {
    grouped.set(environmentId, [...(grouped.get(environmentId) ?? []), permission as Permission]);
  }
  return [...grouped].map(([environmentId, permissions]) => ({ environmentId, permissions }));
}
