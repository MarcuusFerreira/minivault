import { ApplicationError } from '../../../shared/application/application-error.js';

export const apiKeyNotFound = () => new ApplicationError('API_KEY_NOT_FOUND', 'not_found', 'API key not found.');
