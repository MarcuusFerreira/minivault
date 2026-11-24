import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { USER_AUTHENTICATOR } from '../../shared/application/authentication.js';
import { CLOCK } from '../../shared/application/clock.js';
import { ID_GENERATOR } from '../../shared/application/id-generator.js';
import { GET_CURRENT_USER } from './application/ports/input/get-current-user.port.js';
import { LOGIN } from './application/ports/input/login.port.js';
import { REGISTER_USER } from './application/ports/input/register-user.port.js';
import { ACCESS_TOKEN_SERVICE } from './application/ports/output/access-token.port.js';
import { PASSWORD_HASHER } from './application/ports/output/password-hasher.port.js';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user/authenticate-user.use-case.js';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user/get-current-user.use-case.js';
import { LoginUseCase } from './application/use-cases/login/login.use-case.js';
import { RegisterUserUseCase } from './application/use-cases/register-user/register-user.use-case.js';
import { USER_REPOSITORY } from './domain/repositories/user.repository.js';
import { AuthController } from './infrastructure/adapters/input/http/auth.controller.js';
import { PrismaUserRepository } from './infrastructure/adapters/output/persistence/prisma-user.repository.js';
import { Argon2PasswordHasher } from './infrastructure/adapters/output/security/argon2-password-hasher.adapter.js';
import { JwtAccessTokenService } from './infrastructure/adapters/output/security/jwt-access-token.adapter.js';

@Module({
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    {
      provide: ACCESS_TOKEN_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new JwtAccessTokenService(
          config.get('JWT_SECRET', { infer: true }),
          config.get('JWT_TTL_SECONDS', { infer: true }),
        ),
    },
    {
      provide: REGISTER_USER,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ID_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof RegisterUserUseCase>) => new RegisterUserUseCase(...deps),
    },
    {
      provide: LOGIN,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ACCESS_TOKEN_SERVICE],
      useFactory: (...deps: ConstructorParameters<typeof LoginUseCase>) => new LoginUseCase(...deps),
    },
    {
      provide: USER_AUTHENTICATOR,
      inject: [ACCESS_TOKEN_SERVICE, USER_REPOSITORY],
      useFactory: (...deps: ConstructorParameters<typeof AuthenticateUserUseCase>) => new AuthenticateUserUseCase(...deps),
    },
    {
      provide: GET_CURRENT_USER,
      inject: [USER_REPOSITORY],
      useFactory: (...deps: ConstructorParameters<typeof GetCurrentUserUseCase>) => new GetCurrentUserUseCase(...deps),
    },
  ],
  exports: [USER_AUTHENTICATOR],
})
export class IdentityAccessModule {}
