import { z } from 'zod';

export const ENVIRONMENT_NAMES = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export const environmentName = z.enum(ENVIRONMENT_NAMES);
export type EnvironmentNameValue = z.infer<typeof environmentName>;

export const createEnvironmentRequest = z.strictObject({ name: environmentName });
export type CreateEnvironmentRequest = z.infer<typeof createEnvironmentRequest>;

export interface EnvironmentResponse {
  id: string;
  projectId: string;
  name: EnvironmentNameValue;
  createdAt: string;
}
