export const PERMISSIONS = ['SECRETS_READ', 'SECRETS_WRITE'] as const;
export type Permission = (typeof PERMISSIONS)[number];

export interface Grant {
  readonly environmentId: string;
  readonly permissions: readonly Permission[];
}

export interface UserPrincipal {
  readonly kind: 'user';
  readonly userId: string;
}

export interface ApiKeyPrincipal {
  readonly kind: 'apiKey';
  readonly apiKeyId: string;
  readonly projectId: string;
  readonly grants: readonly Grant[];
}

export type Principal = UserPrincipal | ApiKeyPrincipal;

/** Who performed an operation, as recorded in the audit log. */
export interface Actor {
  readonly userId: string | null;
  readonly apiKeyId: string | null;
  readonly ipAddress: string | null;
}

/** Carried by every command and query. */
export interface RequestContext {
  readonly principal: Principal;
  readonly ipAddress: string | null;
}

export function actorOf(context: RequestContext): Actor {
  const { principal, ipAddress } = context;
  return principal.kind === 'user'
    ? { userId: principal.userId, apiKeyId: null, ipAddress }
    : { userId: null, apiKeyId: principal.apiKeyId, ipAddress };
}
