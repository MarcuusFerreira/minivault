import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Env } from '../../../../config/env.js';
import { ApplicationError } from '../../../application/application-error.js';
import {
  API_KEY_AUTHENTICATOR,
  type ApiKeyAuthenticator,
  USER_AUTHENTICATOR,
  type UserAuthenticator,
} from '../../../application/authentication.js';
import type { Principal } from '../../../domain/principal.js';
import { API_KEY_ACCESS, type ApiKeyAccess } from './allow-api-key.decorator.js';
import { IS_PUBLIC } from './public.decorator.js';
import type { AuthenticatedRequest } from './request-context.decorator.js';
import { SESSION_COOKIE } from './session-cookie.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const unauthenticated = () => new ApplicationError('UNAUTHENTICATED', 'unauthenticated', 'Authentication is required.');

/** Authenticates every request. Authorization is decided by the use cases. */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly webOrigin: string;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService<Env, true>,
    @Inject(USER_AUTHENTICATOR) private readonly users: UserAuthenticator,
    @Inject(API_KEY_AUTHENTICATOR) private readonly apiKeys: ApiKeyAuthenticator,
  ) {
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = await this.authenticate(req);
    if (!principal) throw unauthenticated();

    const access = this.reflector.getAllAndOverride<ApiKeyAccess | undefined>(API_KEY_ACCESS, targets);
    if (principal.kind === 'apiKey' && access === undefined) {
      throw new ApplicationError('API_KEY_NOT_ALLOWED', 'forbidden', 'API keys cannot be used here.');
    }
    if (principal.kind === 'user' && access === 'only') {
      throw new ApplicationError('API_KEY_REQUIRED', 'forbidden', 'This endpoint requires an API key.');
    }
    req.principal = principal;
    return true;
  }

  /** One credential is considered, the first present. An invalid one never falls through to the next. */
  private async authenticate(req: AuthenticatedRequest): Promise<Principal | null> {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== undefined) {
      return typeof apiKey === 'string' ? this.apiKeys.authenticate(apiKey) : null;
    }
    const authorization = req.headers.authorization;
    if (authorization !== undefined) {
      return this.user(/^Bearer (\S+)$/.exec(authorization)?.[1]);
    }
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const session = cookies?.[SESSION_COOKIE];
    const principal = await this.user(typeof session === 'string' ? session : undefined);
    if (principal && !SAFE_METHODS.has(req.method) && req.headers.origin !== this.webOrigin) {
      throw new ApplicationError('CSRF_REJECTED', 'forbidden', 'The request origin is not allowed.');
    }
    return principal;
  }

  private async user(token: string | undefined): Promise<Principal | null> {
    const found = token ? await this.users.authenticate(token) : null;
    return found && { kind: 'user', userId: found.userId };
  }
}
