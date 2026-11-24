import { ApplicationError } from '../../../shared/application/application-error.js';

export const environmentNotFound = () => new ApplicationError('ENVIRONMENT_NOT_FOUND', 'not_found', 'Environment not found.');
