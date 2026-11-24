import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { type Env, envSchema } from './config/env.js';
import { AuditManagementModule } from './modules/audit-management/audit-management.module.js';
import { EnvironmentManagementModule } from './modules/environment-management/environment-management.module.js';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module.js';
import { ProjectManagementModule } from './modules/project-management/project-management.module.js';
import { SecretsManagementModule } from './modules/secrets-management/secrets-management.module.js';
import { EngineProbe } from './shared/infrastructure/health/engine-probe.js';
import { HealthController } from './shared/infrastructure/health/health.controller.js';
import { AuthGuard } from './shared/infrastructure/http/auth/auth.guard.js';
import { ErrorFilter } from './shared/infrastructure/http/error.filter.js';
import { SharedKernelModule } from './shared/infrastructure/shared-kernel.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validationSchema: envSchema }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ ttl: 60_000, limit: config.get('THROTTLE_LIMIT', { infer: true }) }],
      }),
    }),
    SharedKernelModule,
    IdentityAccessModule,
    ProjectManagementModule,
    EnvironmentManagementModule,
    SecretsManagementModule,
    AuditManagementModule,
  ],
  controllers: [HealthController],
  providers: [
    EngineProbe,
    { provide: APP_FILTER, useClass: ErrorFilter },
    // Throttling comes first, so guessed credentials are counted too.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
