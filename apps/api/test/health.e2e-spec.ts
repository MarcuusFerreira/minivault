import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { HealthController } from '../src/shared/infrastructure/health/health.controller.js';
import { configureApp } from '../src/configure-app.js';

describe('health', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [HealthController] }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('answers liveness outside the API prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  it('does not expose liveness under the API prefix', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });
});
