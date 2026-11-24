import type { User } from '../entities/user.entity.js';
import type { Email } from '../value-objects/email.vo.js';

export interface UserRepository {
  /** @throws EmailAlreadyRegisteredError */
  add(user: User): Promise<void>;
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}
export const USER_REPOSITORY = Symbol('UserRepository');
