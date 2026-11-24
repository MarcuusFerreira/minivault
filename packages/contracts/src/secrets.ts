import { z } from 'zod';
import { environmentName } from './environments.js';

export const SECRET_KEY_PATTERN = /^[A-Z_][A-Z0-9_]{0,127}$/;
export const SECRET_VALUE_MAX_BYTES = 32768;

export const secretKey = z
  .string()
  .regex(SECRET_KEY_PATTERN, 'Start with A-Z or _, then use A-Z, 0-9 and _, up to 128 characters');
/** Never trimmed: whitespace can be part of a secret. Byte length and encoding are checked by the domain. */
export const secretValue = z.string().max(SECRET_VALUE_MAX_BYTES);

export const createSecretRequest = z.strictObject({ key: secretKey, value: secretValue });
export type CreateSecretRequest = z.infer<typeof createSecretRequest>;

export const updateSecretRequest = z.strictObject({ value: secretValue });
export type UpdateSecretRequest = z.infer<typeof updateSecretRequest>;

const keyList = z.string().min(1).max(13000).optional();
export const secretValuesQuery = z.strictObject({ keys: keyList });
export type SecretValuesQuery = z.infer<typeof secretValuesQuery>;

export interface SecretMetadataResponse {
  id: string;
  key: string;
  encryptionKeyVersion: number;
  createdAt: string;
  updatedAt: string;
}
export type SecretValueResponse = SecretMetadataResponse & { value: string };

export const machineSecretsQuery = z.strictObject({ environment: environmentName, keys: keyList });
export type MachineSecretsQuery = z.infer<typeof machineSecretsQuery>;

export interface MachineSecretsResponse {
  environment: string;
  secrets: Record<string, string>;
}
