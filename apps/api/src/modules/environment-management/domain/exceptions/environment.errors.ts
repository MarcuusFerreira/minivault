import { DomainConflictError, DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidEnvironmentNameError extends DomainError {
  readonly code = 'ENVIRONMENT_NAME_INVALID';
  constructor() {
    super('The environment must be DEVELOPMENT, STAGING or PRODUCTION.');
  }
}

export class EnvironmentExistsError extends DomainConflictError {
  readonly code = 'ENVIRONMENT_EXISTS';
  constructor() {
    super('The project already has this environment.');
  }
}
