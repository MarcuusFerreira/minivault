import { Injectable } from '@nestjs/common';
import { PrismaContext } from '../../../../../../shared/infrastructure/prisma/prisma-context.js';
import { isUniqueViolation } from '../../../../../../shared/infrastructure/prisma/prisma.service.js';
import type { Secret } from '../../../../domain/entities/secret.entity.js';
import { SecretKeyTakenError } from '../../../../domain/exceptions/secret.errors.js';
import type { SecretRepository, SecretScope } from '../../../../domain/repositories/secret.repository.js';
import { secretMapper } from './secret.mapper.js';

/** The project is part of every condition, so a mismatched scope finds nothing. */
const within = ({ projectId, environmentId }: SecretScope) => ({ environmentId, environment: { projectId } });

@Injectable()
export class PrismaSecretRepository implements SecretRepository {
  constructor(private readonly context: PrismaContext) {}

  async add(secret: Secret): Promise<void> {
    try {
      await this.context.client.secret.create({ data: secretMapper.toRow(secret) });
    } catch (error) {
      if (isUniqueViolation(error)) throw new SecretKeyTakenError();
      throw error;
    }
  }

  async save(secret: Secret): Promise<boolean> {
    const { encryptedValue, nonce, encryptionKeyVersion, updatedAt } = secretMapper.toRow(secret);
    const { count } = await this.context.client.secret.updateMany({
      where: { id: secret.id, ...within(secret) },
      data: { encryptedValue, nonce, encryptionKeyVersion, updatedAt },
    });
    return count === 1;
  }

  async remove(secret: Secret): Promise<boolean> {
    const { count } = await this.context.client.secret.deleteMany({ where: { id: secret.id, ...within(secret) } });
    return count === 1;
  }

  async findById(scope: SecretScope, id: string): Promise<Secret | null> {
    const row = await this.context.client.secret.findFirst({ where: { id, ...within(scope) } });
    return row && secretMapper.toDomain(row, scope.projectId);
  }

  async findByKeys(scope: SecretScope, keys: readonly string[] | null, limit: number): Promise<Secret[]> {
    const rows = await this.context.client.secret.findMany({
      where: { ...within(scope), ...(keys && { key: { in: [...keys] } }) },
      orderBy: { key: 'asc' },
      take: limit,
    });
    return rows.map((row) => secretMapper.toDomain(row, scope.projectId));
  }

  async list(scope: SecretScope): Promise<Secret[]> {
    const rows = await this.context.client.secret.findMany({ where: within(scope), orderBy: { key: 'asc' } });
    return rows.map((row) => secretMapper.toDomain(row, scope.projectId));
  }
}
