import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../../generated/prisma/client.js';
import { PrismaContext } from '../../../../../../shared/infrastructure/prisma/prisma-context.js';
import type { ApiKey } from '../../../../domain/entities/api-key.entity.js';
import type { ApiKeyRepository } from '../../../../domain/repositories/api-key.repository.js';
import { apiKeyMapper } from './api-key.mapper.js';

const include = { grants: { orderBy: [{ environmentId: 'asc' }, { permission: 'asc' }] } } satisfies Prisma.ApiKeyInclude;

@Injectable()
export class PrismaApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly context: PrismaContext) {}

  async add(key: ApiKey): Promise<void> {
    await this.context.client.apiKey.create({ data: apiKeyMapper.toRow(key) });
    await this.context.client.apiKeyGrant.createMany({ data: apiKeyMapper.toGrantRows(key) });
  }

  async revoke(key: ApiKey): Promise<boolean> {
    const { count } = await this.context.client.apiKey.updateMany({
      where: { id: key.id, projectId: key.projectId, revokedAt: null },
      data: { revokedAt: key.revokedAt },
    });
    return count === 1;
  }

  async findById(projectId: string, id: string): Promise<ApiKey | null> {
    const row = await this.context.client.apiKey.findFirst({ where: { id, projectId }, include });
    return row && apiKeyMapper.toDomain(row);
  }

  async findByHash(hash: string): Promise<ApiKey | null> {
    const row = await this.context.client.apiKey.findUnique({ where: { keyHash: hash }, include });
    return row && apiKeyMapper.toDomain(row);
  }

  async listByProject(projectId: string): Promise<ApiKey[]> {
    const rows = await this.context.client.apiKey.findMany({
      where: { projectId },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(apiKeyMapper.toDomain);
  }

  async touchLastUsed(id: string, now: Date): Promise<void> {
    await this.context.client.apiKey.updateMany({ where: { id, revokedAt: null }, data: { lastUsedAt: now } });
  }
}
