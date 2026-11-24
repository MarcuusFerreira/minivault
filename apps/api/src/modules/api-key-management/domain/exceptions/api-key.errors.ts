import { DomainConflictError, DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidApiKeyNameError extends DomainError {
  readonly code = 'API_KEY_NAME_INVALID';
  constructor() {
    super('The API key name must have between 1 and 100 characters.');
  }
}

export class InvalidApiKeyGrantsError extends DomainError {
  readonly code = 'API_KEY_GRANTS_INVALID';
  constructor() {
    super('An API key needs at least one environment, each listed once with at least one permission.');
  }
}

export class InvalidApiKeyExpiryError extends DomainError {
  readonly code = 'API_KEY_EXPIRY_INVALID';
  constructor() {
    super('The expiry date must be in the future.');
  }
}

export class ApiKeyAlreadyRevokedError extends DomainConflictError {
  readonly code = 'API_KEY_ALREADY_REVOKED';
  constructor() {
    super('The API key is already revoked.');
  }
}

export class ApiKeyNotActiveError extends DomainConflictError {
  readonly code = 'API_KEY_NOT_ACTIVE';
  constructor() {
    super('Only an active API key can be rotated.');
  }
}
