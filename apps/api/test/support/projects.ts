import type { Server } from 'node:http';
import request from 'supertest';

export interface TestProject {
  id: string;
  environments: Record<'DEVELOPMENT' | 'STAGING' | 'PRODUCTION', string>;
  secretsPath(name?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION'): string;
}

export async function createProject(http: Server, token: string, name = 'Payments'): Promise<TestProject> {
  const auth = { Authorization: `Bearer ${token}` };
  const { body: project } = await request(http).post('/api/v1/projects').set(auth).send({ name }).expect(201);
  const { body: list } = await request(http).get(`/api/v1/projects/${project.id as string}/environments`).set(auth).expect(200);
  const environments = Object.fromEntries(
    (list as { id: string; name: string }[]).map((e) => [e.name, e.id]),
  ) as TestProject['environments'];
  const id = project.id as string;
  return {
    id,
    environments,
    secretsPath: (environment = 'PRODUCTION') => `/api/v1/projects/${id}/environments/${environments[environment]}/secrets`,
  };
}
