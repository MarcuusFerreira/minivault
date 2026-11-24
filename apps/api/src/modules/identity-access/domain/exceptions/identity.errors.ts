import { DomainConflictError, DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidEmailError extends DomainError {
  readonly code = 'EMAIL_INVALID';
  constructor() {
    super('The email address is invalid.');
  }
}

export class InvalidPasswordError extends DomainError {
  readonly code = 'PASSWORD_INVALID';
  constructor() {
    super('The password must have between 12 and 128 characters.');
  }
}

export class InvalidUserNameError extends DomainError {
  readonly code = 'USER_NAME_INVALID';
  constructor() {
    super('The name must have between 1 and 100 characters.');
  }
}

export class EmailAlreadyRegisteredError extends DomainConflictError {
  readonly code = 'EMAIL_ALREADY_REGISTERED';
  constructor() {
    super('This email address is already registered.');
  }
}
