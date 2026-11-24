import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.js';
import { HealthController } from './shared/infrastructure/health/health.controller.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validationSchema: envSchema })],
  controllers: [HealthController],
})
export class AppModule {}
