export interface UnitOfWork {
  /** Runs work in one transaction. A nested call joins the surrounding one. */
  run<T>(work: () => Promise<T>): Promise<T>;
}
export const UNIT_OF_WORK = Symbol('UnitOfWork');
