import type { ErrorResponse } from '@minivault/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: () => void = () => {};
/** Called when the session is refused, whoever made the request. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** For the endpoints where 401 is an answer rather than an expired session. */
  authEndpoint?: boolean;
}

/** The session lives in an HttpOnly cookie, so there is no token to handle here. */
export async function api<T>(path: string, { method = 'GET', body, authEndpoint = false }: Options = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(new URL(`/api/v1${path}`, window.location.origin), {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'The server could not be reached. Try again.');
  }
  if (response.ok) return (response.status === 204 ? undefined : await response.json()) as T;

  if (response.status === 401 && !authEndpoint) onUnauthorized();
  const failure = (await response.json().catch(() => null)) as ErrorResponse | null;
  throw new ApiError(
    response.status,
    failure?.error.code ?? 'UNKNOWN',
    failure?.error.message ?? 'The server could not complete the request. Try again.',
    failure?.error.correlationId,
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}
