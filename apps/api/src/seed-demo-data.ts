import type { INestApplicationContext } from '@nestjs/common';
import { GENERATE_API_KEY, type GenerateApiKeyPort } from './modules/api-key-management/application/ports/input/generate-api-key.port.js';
import { LIST_ENVIRONMENTS, type ListEnvironmentsPort } from './modules/environment-management/application/ports/input/list-environments.port.js';
import { REGISTER_USER, type RegisterUserPort } from './modules/identity-access/application/ports/input/register-user.port.js';
import { CREATE_PROJECT, type CreateProjectPort } from './modules/project-management/application/ports/input/create-project.port.js';
import { STORE_SECRET, type StoreSecretPort } from './modules/secrets-management/application/ports/input/store-secret.port.js';
import { DomainConflictError } from './shared/domain/domain-error.js';
import type { RequestContext } from './shared/domain/principal.js';

const EMAIL = 'demo@minivault.local';

const PROJECTS = [
  {
    name: 'Storefront',
    description: 'Demonstration project with fictitious values',
    secrets: { DATABASE_URL: 'demo-database-url', SESSION_SECRET: 'demo-session-secret', CDN_TOKEN: 'demo-cdn-token' },
  },
  {
    name: 'Billing',
    description: 'Demonstration project with fictitious values',
    secrets: { PAYMENT_API_KEY: 'demo-payment-api-key', WEBHOOK_SECRET: 'demo-webhook-secret' },
  },
];

/** An input adapter: goes through the same ports as HTTP. Returns null when the data already exists. */
export async function seedDemoData(app: INestApplicationContext, password: string): Promise<{ email: string; apiKey: string } | null> {
  const port = <T>(token: symbol): T => app.get<T>(token, { strict: false });

  let userId: string;
  try {
    ({ id: userId } = await port<RegisterUserPort>(REGISTER_USER).execute({ name: 'Demo User', email: EMAIL, password }));
  } catch (error) {
    if (error instanceof DomainConflictError) return null;
    throw error;
  }
  const context: RequestContext = { principal: { kind: 'user', userId }, ipAddress: null };

  let apiKey = '';
  for (const { name, description, secrets } of PROJECTS) {
    const { id: projectId } = await port<CreateProjectPort>(CREATE_PROJECT).execute({ context, name, description });
    const environments = await port<ListEnvironmentsPort>(LIST_ENVIRONMENTS).execute({ context, projectId });
    for (const { id: environmentId, name: environment } of environments) {
      for (const [key, value] of Object.entries(secrets)) {
        await port<StoreSecretPort>(STORE_SECRET).execute({
          context,
          projectId,
          environmentId,
          key,
          value: `${value}-${environment.toLowerCase()}`,
        });
      }
    }
    if (apiKey === '') {
      const issued = await port<GenerateApiKeyPort>(GENERATE_API_KEY).execute({
        context,
        projectId,
        name: 'Demo deploy',
        expiresAt: null,
        grants: environments.map(({ id }) => ({ environmentId: id, permissions: ['SECRETS_READ'] })),
      });
      apiKey = issued.plaintext;
    }
  }
  return { email: EMAIL, apiKey };
}
