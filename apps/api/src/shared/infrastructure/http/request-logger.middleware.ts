import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { Principal } from '../../domain/principal.js';

const logger = new Logger('HTTP');

/** Logs the route pattern, never the URL, headers or body: those can carry secrets. */
export function requestLogger(req: Request & { principal?: Principal }, res: Response, next: NextFunction): void {
  const startedAt = performance.now();
  res.on('finish', () => {
    const route: unknown = (req.route as { path?: unknown } | undefined)?.path;
    if (route === '/health' || route === '/ready') return;
    logger.log('request', {
      correlationId: res.getHeader('X-Correlation-Id'),
      method: req.method,
      route: typeof route === 'string' ? route : '(unmatched)',
      status: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
      principalKind: req.principal?.kind ?? 'anonymous',
    });
  });
  next();
}
