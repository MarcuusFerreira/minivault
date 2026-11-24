import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal, RequestContext } from '../../../domain/principal.js';

export type AuthenticatedRequest = Request & { principal?: Principal };

export const Ctx = createParamDecorator((_: unknown, context: ExecutionContext): RequestContext => {
  const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!req.principal) throw new Error('Ctx used on a route without authentication');
  return { principal: req.principal, ipAddress: req.ip ?? null };
});
