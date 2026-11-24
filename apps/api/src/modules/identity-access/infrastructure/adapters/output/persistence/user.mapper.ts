import type { User as UserRow } from '../../../../../../generated/prisma/client.js';
import { User } from '../../../../domain/entities/user.entity.js';
import { Email } from '../../../../domain/value-objects/email.vo.js';

export const userMapper = {
  toDomain: (row: UserRow): User => User.restore({ ...row, email: Email.create(row.email) }),
  toRow: (user: User): UserRow => ({
    id: user.id,
    name: user.name,
    email: user.email.value,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }),
};
