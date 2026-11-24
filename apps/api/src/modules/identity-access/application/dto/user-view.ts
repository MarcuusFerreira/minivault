import type { User } from '../../domain/entities/user.entity.js';

export interface UserView {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export function toUserView(user: User): UserView {
  return { id: user.id, name: user.name, email: user.email.value, createdAt: user.createdAt };
}
