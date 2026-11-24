import request from 'supertest';
import { createTestApp, type TestApp } from './support/app.js';

describe('health', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('answers liveness outside the API prefix', async () => {
    await request(t.http).get('/health').expect(200, { status: 'ok' });
  });

  it('does not expose liveness under the API prefix', async () => {
    await request(t.http).get('/api/v1/health').expect(404);
  });
});
