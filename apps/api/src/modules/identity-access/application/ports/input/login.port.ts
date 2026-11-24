import type { UserView } from '../../dto/user-view.js';

export interface LoginCommand {
  email: string;
  password: string;
}
export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: UserView;
}
export interface LoginPort {
  execute(command: LoginCommand): Promise<LoginResult>;
}
export const LOGIN = Symbol('LoginPort');
