import { InvalidEnvironmentNameError } from '../exceptions/environment.errors.js';

/** In promotion order, which is also the display order. */
const NAMES = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export type EnvironmentNameText = (typeof NAMES)[number];

export class EnvironmentName {
  private constructor(readonly value: EnvironmentNameText) {}

  static create(raw: string): EnvironmentName {
    const value = NAMES.find((name) => name === raw);
    if (!value) throw new InvalidEnvironmentNameError();
    return new EnvironmentName(value);
  }

  static all(): EnvironmentName[] {
    return NAMES.map((name) => new EnvironmentName(name));
  }

  get order(): number {
    return NAMES.indexOf(this.value);
  }
}
