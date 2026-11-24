import type {
  ApiKeyResponse,
  AuditLogPage,
  EnvironmentResponse,
  ProjectResponse,
  SecretMetadataResponse,
  UserResponse,
} from '@minivault/contracts';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

export const CANARY = 'CANARY-9f3c';
const at = '2030-01-01T10:00:00.000Z';
export const user: UserResponse = { id: 'u1', name: 'Test User', email: 'user@example.test', createdAt: at };
export const project: ProjectResponse = {
  id: 'p1', name: 'Payments', description: 'Card processing', environmentCount: 3, secretCount: 2, createdAt: at, updatedAt: at,
};
export const environments: EnvironmentResponse[] = (['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const).map((name, i) => ({
  id: `e${i + 1}`, projectId: 'p1', name, createdAt: at,
}));
export const secret = (id: string, key: string): SecretMetadataResponse => ({ id, key, encryptionKeyVersion: 1, createdAt: at, updatedAt: at });

/** Mutable state of the simulated backend. */
export const backend = {
  signedIn: true,
  projects: [] as ProjectResponse[],
  secrets: [] as SecretMetadataResponse[],
  apiKeys: [] as ApiKeyResponse[],
  audit: { items: [], nextCursor: null } as AuditLogPage,
  requests: [] as { method: string; path: string; body: unknown }[],
};

export function resetBackend() {
  Object.assign(backend, {
    signedIn: true,
    projects: [project],
    secrets: [secret('s1', 'DATABASE_URL'), secret('s2', 'STRIPE_KEY')],
    apiKeys: [],
    audit: { items: [], nextCursor: null },
    requests: [],
  });
}
resetBackend();

export const failure = (status: number, code: string, message = code) =>
  HttpResponse.json({ error: { code, message, correlationId: 'corr-12345' } }, { status });

const guarded = (respond: (info: { params: Record<string, string>; request: Request }) => Response | Promise<Response>) =>
  async ({ params, request }: { params: Record<string, unknown>; request: Request }) => {
    const url = new URL(request.url);
    const text = await request.clone().text();
    backend.requests.push({ method: request.method, path: url.pathname + url.search, body: text ? JSON.parse(text) : undefined });
    return backend.signedIn ? respond({ params: params as Record<string, string>, request }) : failure(401, 'UNAUTHENTICATED');
  };

const api = (path: string) => `*/api/v1${path}`;
const SECRETS = '/projects/:projectId/environments/:environmentId/secrets';

export const server = setupServer(
  http.get(api('/auth/me'), () => (backend.signedIn ? HttpResponse.json(user) : failure(401, 'UNAUTHENTICATED'))),
  http.post(api('/auth/session'), () => {
    backend.signedIn = true;
    return HttpResponse.json({ user });
  }),
  http.post(api('/auth/register'), () => HttpResponse.json(user, { status: 201 })),
  http.delete(api('/auth/session'), () => {
    backend.signedIn = false;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(api('/projects'), guarded(() => HttpResponse.json(backend.projects))),
  http.post(api('/projects'), guarded(async ({ request }) => {
    const body = (await request.json()) as { name: string; description: string };
    const created = { ...project, ...body, id: 'p2', secretCount: 0 };
    backend.projects = [created, ...backend.projects];
    return HttpResponse.json(created, { status: 201 });
  })),
  http.get(api('/projects/:projectId'), guarded(({ params }) => {
    const found = backend.projects.find((p) => p.id === params.projectId);
    return found ? HttpResponse.json(found) : failure(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  })),
  http.patch(api('/projects/:projectId'), guarded(async ({ request }) => {
    const updated = { ...project, ...((await request.json()) as object) };
    backend.projects = [updated];
    return HttpResponse.json(updated);
  })),
  http.delete(api('/projects/:projectId'), guarded(({ params }) => {
    backend.projects = backend.projects.filter((p) => p.id !== params.projectId);
    return new HttpResponse(null, { status: 204 });
  })),
  http.get(api('/projects/:projectId/environments'), guarded(() => HttpResponse.json(environments))),
  http.get(api(SECRETS), guarded(() => HttpResponse.json(backend.secrets))),
  http.post(api(SECRETS), guarded(async ({ request }) => {
    const created = secret('s3', ((await request.json()) as { key: string }).key);
    backend.secrets = [...backend.secrets, created];
    return HttpResponse.json(created, { status: 201 });
  })),
  http.get(api(`${SECRETS}/:secretId`), guarded(({ params }) =>
    HttpResponse.json({ ...backend.secrets.find((s) => s.id === params.secretId), value: `${CANARY}-${params.secretId}` }))),
  http.patch(api(`${SECRETS}/:secretId`), guarded(({ params }) => HttpResponse.json(backend.secrets.find((s) => s.id === params.secretId)))),
  http.delete(api(`${SECRETS}/:secretId`), guarded(({ params }) => {
    backend.secrets = backend.secrets.filter((s) => s.id !== params.secretId);
    return new HttpResponse(null, { status: 204 });
  })),
  http.get(api('/projects/:projectId/api-keys'), guarded(() => HttpResponse.json(backend.apiKeys))),
  http.post(api('/projects/:projectId/api-keys'), guarded(async ({ request }) => {
    const body = (await request.json()) as Pick<ApiKeyResponse, 'name' | 'expiresAt' | 'grants'>;
    const created: ApiKeyResponse = { id: 'k1', prefix: 'mv_abcdefgh', status: 'active', lastUsedAt: null, revokedAt: null, createdAt: at, ...body };
    backend.apiKeys = [created];
    return HttpResponse.json({ ...created, plaintext: `mv_${CANARY}` }, { status: 201 });
  })),
  http.post(api('/projects/:projectId/api-keys/:id/rotate'), guarded(() =>
    HttpResponse.json({ ...backend.apiKeys[0], id: 'k2', plaintext: `mv_${CANARY}` }, { status: 201 }))),
  http.delete(api('/projects/:projectId/api-keys/:id'), guarded(() => {
    backend.apiKeys = backend.apiKeys.map((k) => ({ ...k, status: 'revoked', revokedAt: at }));
    return new HttpResponse(null, { status: 204 });
  })),
  http.get(api('/audit-logs'), guarded(() => HttpResponse.json(backend.audit))),
);
