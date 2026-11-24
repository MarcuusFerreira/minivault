import { DomainConflictError, DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidEncryptedValueError extends DomainError {
  readonly code = 'ENCRYPTED_VALUE_INVALID';
  constructor() {
    super('The encrypted value is malformed.');
  }
}

export class InvalidSecretKeyError extends DomainError {
  readonly code = 'SECRET_KEY_INVALID';
  constructor() {
    super('A secret key starts with A-Z or _ and contains only A-Z, 0-9 and _, up to 128 characters.');
  }
}

export class InvalidSecretValueError extends DomainError {
  readonly code = 'SECRET_VALUE_INVALID';
  constructor() {
    super('A secret value must be valid Unicode text of at most 32768 bytes.');
  }
}

export class SecretKeyTakenError extends DomainConflictError {
  readonly code = 'SECRET_KEY_TAKEN';
  constructor() {
    super('The environment already has a secret with this key.');
  }
}
