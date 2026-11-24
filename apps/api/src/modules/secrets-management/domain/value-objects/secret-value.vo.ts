import { InvalidSecretValueError } from '../exceptions/secret.errors.js';

const MAX_BYTES = 32768;
const REDACTED = '[REDACTED]';

/** Plaintext that can only be read through reveal(). */
export class SecretValue {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  static create(raw: string): SecretValue {
    // An unpaired surrogate has no UTF-8 form and would come back altered.
    if (!raw.isWellFormed() || new TextEncoder().encode(raw).length > MAX_BYTES) throw new InvalidSecretValueError();
    return new SecretValue(raw);
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return REDACTED;
  }

  toJSON(): string {
    return REDACTED;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return REDACTED;
  }
}
