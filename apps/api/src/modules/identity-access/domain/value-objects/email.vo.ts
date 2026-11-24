import { InvalidEmailError } from '../exceptions/identity.errors.js';

const SHAPE = /^[^\s@]+@[^\s@]+$/;
const MAX_LENGTH = 254;

export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (value.length > MAX_LENGTH || !SHAPE.test(value)) throw new InvalidEmailError();
    return new Email(value);
  }
}
