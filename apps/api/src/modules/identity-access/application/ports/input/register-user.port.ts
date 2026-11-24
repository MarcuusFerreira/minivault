import type { UserView } from '../../dto/user-view.js';

export interface RegisterUserCommand {
  name: string;
  email: string;
  password: string;
}
export interface RegisterUserPort {
  execute(command: RegisterUserCommand): Promise<UserView>;
}
export const REGISTER_USER = Symbol('RegisterUserPort');
