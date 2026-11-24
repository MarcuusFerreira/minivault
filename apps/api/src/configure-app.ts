import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { createOpenApiDocument } from './openapi.js';
import { correlationId } from './shared/infrastructure/http/correlation-id.middleware.js';
import { requestLogger } from './shared/infrastructure/http/request-logger.middleware.js';

/** HTTP setup shared by main.ts and the integration tests. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  // Exactly one trusted hop: the nginx container, which overwrites X-Forwarded-For.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(correlationId, requestLogger, helmet(), cookieParser());
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true });
  app.useBodyParser('json', { limit: '256kb' });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  SwaggerModule.setup('api/docs', app, () => createOpenApiDocument(app));
}
