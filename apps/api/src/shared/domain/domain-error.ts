/** A violated business rule. Messages must never contain secret material. */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A business rule violated because of existing state, for example a duplicate name. */
export abstract class DomainConflictError extends DomainError {}
