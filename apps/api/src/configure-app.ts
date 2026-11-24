import type { NestExpressApplication } from '@nestjs/platform-express';

/** HTTP setup shared by main.ts and the integration tests. */
export function configureApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
}
