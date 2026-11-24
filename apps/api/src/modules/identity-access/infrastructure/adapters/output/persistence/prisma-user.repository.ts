import { Injectable } from '@nestjs/common';
import { PrismaContext } from '../../../../../../shared/infrastructure/prisma/prisma-context.js';
import { isUniqueViolation } from '../../../../../../shared/infrastructure/prisma/prisma.service.js';
import type { User } from '../../../../domain/entities/user.entity.js';
import { EmailAlreadyRegisteredError } from '../../../../domain/exceptions/identity.errors.js';
import type { UserRepository } from '../../../../domain/repositories/user.repository.js';
import type { Email } from '../../../../domain/value-objects/email.vo.js';
import { userMapper } from './user.mapper.js';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly context: PrismaContext) {}

  async add(user: User): Promise<void> {
    try {
      await this.context.client.user.create({ data: userMapper.toRow(user) });
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailAlreadyRegisteredError();
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.context.client.user.findUnique({ where: { email: email.value } });
    return row && userMapper.toDomain(row);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.context.client.user.findUnique({ where: { id } });
    return row && userMapper.toDomain(row);
  }
}
