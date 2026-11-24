import { DomainError } from '../../../../shared/domain/domain-error.js';

export class InvalidAuditMetadataError extends DomainError {
  readonly code = 'AUDIT_METADATA_INVALID';
  constructor() {
    super('Audit metadata contains a field that is not allowed.');
  }
}

export class InvalidAuditCursorError extends DomainError {
  readonly code = 'AUDIT_CURSOR_INVALID';
  constructor() {
    super('The cursor is invalid.');
  }
}
