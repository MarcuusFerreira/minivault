import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { correlationId } from './shared/infrastructure/http/correlation-id.middleware.js';
import { requestLogger } from './shared/infrastructure/http/request-logger.middleware.js';

/** HTTP setup shared by main.ts and the integration tests. */
export function configureApp(app: NestExpressApplication): void {
  // Exactly one trusted hop: the nginx container, which overwrites X-Forwarded-For.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(correlationId, requestLogger);
  app.useBodyParser('json', { limit: '256kb' });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
}
