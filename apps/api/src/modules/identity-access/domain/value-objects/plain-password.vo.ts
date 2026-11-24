import { InvalidPasswordError } from '../exceptions/identity.errors.js';

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

/** Private field: invisible to JSON, template literals and object inspection. */
export class PlainPassword {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  static create(raw: string): PlainPassword {
    if (raw.length < MIN_LENGTH || raw.length > MAX_LENGTH) throw new InvalidPasswordError();
    return new PlainPassword(raw);
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return '[REDACTED]';
  }
}
