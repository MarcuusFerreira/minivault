import { DomainConflictError, DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidProjectNameError extends DomainError {
  readonly code = 'PROJECT_NAME_INVALID';
  constructor() {
    super('The project name must have between 1 and 100 characters.');
  }
}

export class InvalidProjectDescriptionError extends DomainError {
  readonly code = 'PROJECT_DESCRIPTION_INVALID';
  constructor() {
    super('The project description must have at most 500 characters.');
  }
}

export class ProjectNameTakenError extends DomainConflictError {
  readonly code = 'PROJECT_NAME_TAKEN';
  constructor() {
    super('You already have a project with this name.');
  }
}
