import type { NextFunction, Request, Response } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

const storage = new AsyncLocalStorage<string>();
const ACCEPTED = /^[A-Za-z0-9-]{8,64}$/;

export function resolveCorrelationId(inbound: string | string[] | undefined): string {
  return typeof inbound === 'string' && ACCEPTED.test(inbound) ? inbound : randomUUID();
}

export function currentCorrelationId(): string {
  return storage.getStore() ?? randomUUID();
}

/** Middleware rather than interceptor: rejected requests must carry the id as well. */
export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const id = resolveCorrelationId(req.headers['x-correlation-id']);
  res.setHeader('X-Correlation-Id', id);
  storage.run(id, next);
}
