import { AggregateRoot } from '../../../../shared/domain/aggregate-root.js';
import { isStorableText } from '../../../../shared/domain/text.js';
import { InvalidUserNameError } from '../exceptions/identity.errors.js';
import { Email } from '../value-objects/email.vo.js';

export interface UserState {
  id: string;
  name: string;
  email: Email;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends AggregateRoot {
  readonly #passwordHash: string;

  private constructor(
    readonly id: string,
    readonly name: string,
    readonly email: Email,
    passwordHash: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    super();
    this.#passwordHash = passwordHash;
  }

  static register(input: { id: string; name: string; email: Email; passwordHash: string; now: Date }): User {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 100 || !isStorableText(name)) throw new InvalidUserNameError();
    return new User(input.id, name, input.email, input.passwordHash, input.now, input.now);
  }

  static restore(state: UserState): User {
    return new User(state.id, state.name, state.email, state.passwordHash, state.createdAt, state.updatedAt);
  }

  get passwordHash(): string {
    return this.#passwordHash;
  }
}
