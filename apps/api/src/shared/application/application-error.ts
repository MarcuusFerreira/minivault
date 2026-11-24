export type ApplicationErrorKind =
  | 'not_found'
  | 'conflict'
  | 'forbidden'
  | 'unauthenticated'
  | 'invalid'
  | 'unavailable'
  | 'internal';

/** A use case that could not complete. Messages must never contain secret material. */
export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    readonly kind: ApplicationErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
