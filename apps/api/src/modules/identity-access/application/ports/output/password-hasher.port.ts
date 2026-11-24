export interface PasswordHasher {
  hash(password: string): Promise<string>;
  /** Takes as long without a hash as with one, so callers do not reveal whether a user exists. */
  verify(password: string, hash: string | null): Promise<boolean>;
}
export const PASSWORD_HASHER = Symbol('PasswordHasher');
