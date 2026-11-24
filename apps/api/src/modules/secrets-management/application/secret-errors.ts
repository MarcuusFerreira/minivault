import { ApplicationError } from '../../../shared/application/application-error.js';

export const secretNotFound = () => new ApplicationError('SECRET_NOT_FOUND', 'not_found', 'Secret not found.');

/** Key names are metadata, not secret material. */
export const secretsNotFound = (keys: readonly string[]) =>
  new ApplicationError('SECRET_NOT_FOUND', 'not_found', `Secrets not found: ${keys.join(', ')}.`);

export const tooManySecrets = (limit: number) =>
  new ApplicationError('TOO_MANY_SECRETS', 'invalid', `At most ${limit} secrets can be read at once. Name the keys you need.`);

export const environmentNotFound = () => new ApplicationError('ENVIRONMENT_NOT_FOUND', 'not_found', 'Environment not found.');

export const permissionDenied = () =>
  new ApplicationError('PERMISSION_DENIED', 'forbidden', 'This API key lacks the required permission on the environment.');
