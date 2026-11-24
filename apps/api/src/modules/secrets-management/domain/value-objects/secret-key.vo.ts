import { InvalidSecretKeyError } from '../exceptions/secret.errors.js';

const SHAPE = /^[A-Z_][A-Z0-9_]{0,127}$/;

export class SecretKey {
  private constructor(readonly value: string) {}

  static create(raw: string): SecretKey {
    if (!SHAPE.test(raw)) throw new InvalidSecretKeyError();
    return new SecretKey(raw);
  }
}
