import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { envSchema } from './config/env.js';
import { HealthController } from './shared/infrastructure/health/health.controller.js';
import { ErrorFilter } from './shared/infrastructure/http/error.filter.js';
import { SharedKernelModule } from './shared/infrastructure/shared-kernel.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validationSchema: envSchema }),
    SharedKernelModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ErrorFilter }],
})
export class AppModule {}
