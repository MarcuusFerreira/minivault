import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type UserResponse,
  loginRequest,
  registerRequest,
} from '@minivault/contracts';
import type { CookieOptions, Response } from 'express';
import type { Env } from '../../../../../../config/env.js';
import { ApplicationError } from '../../../../../../shared/application/application-error.js';
import type { RequestContext } from '../../../../../../shared/domain/principal.js';
import { Public } from '../../../../../../shared/infrastructure/http/auth/public.decorator.js';
import { Ctx } from '../../../../../../shared/infrastructure/http/auth/request-context.decorator.js';
import { SESSION_COOKIE, SESSION_COOKIE_PATH } from '../../../../../../shared/infrastructure/http/auth/session-cookie.js';
import type { UserView } from '../../../../application/dto/user-view.js';
import { GET_CURRENT_USER, type GetCurrentUserPort } from '../../../../application/ports/input/get-current-user.port.js';
import { LOGIN, type LoginPort } from '../../../../application/ports/input/login.port.js';
import { REGISTER_USER, type RegisterUserPort } from '../../../../application/ports/input/register-user.port.js';

const STRICT = { default: { ttl: 60_000, limit: () => Number(process.env.AUTH_THROTTLE_LIMIT ?? 5) } };

const toResponse = (user: UserView): UserResponse => ({ ...user, createdAt: user.createdAt.toISOString() });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    @Inject(REGISTER_USER) private readonly registerUser: RegisterUserPort,
    @Inject(LOGIN) private readonly loginUser: LoginPort,
    @Inject(GET_CURRENT_USER) private readonly currentUser: GetCurrentUserPort,
  ) {}

  @Public()
  @Throttle(STRICT)
  @Post('register')
  async register(@Body({ schema: registerRequest }) body: RegisterRequest): Promise<UserResponse> {
    return toResponse(await this.registerUser.execute(body));
  }

  /** For API clients: the token is in the body. */
  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(@Body({ schema: loginRequest }) body: LoginRequest): Promise<LoginResponse> {
    const { accessToken, expiresIn, user } = await this.loginUser.execute(body);
    return { accessToken, tokenType: 'Bearer', expiresIn, user: toResponse(user) };
  }

  /** For browsers: the token is in a cookie scripts cannot read. */
  @Public()
  @Throttle(STRICT)
  @Post('session')
  @HttpCode(200)
  async openSession(
    @Body({ schema: loginRequest }) body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: UserResponse }> {
    const { accessToken, expiresIn, user } = await this.loginUser.execute(body);
    res.cookie(SESSION_COOKIE, accessToken, { ...this.cookieOptions(), maxAge: expiresIn * 1000 });
    return { user: toResponse(user) };
  }

  @Public()
  @Delete('session')
  @HttpCode(204)
  closeSession(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@Ctx() context: RequestContext): Promise<UserResponse> {
    if (context.principal.kind !== 'user') {
      throw new ApplicationError('FORBIDDEN', 'forbidden', 'You are not allowed to do this.');
    }
    return toResponse(await this.currentUser.execute(context.principal.userId));
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: SESSION_COOKIE_PATH,
    };
  }
}
