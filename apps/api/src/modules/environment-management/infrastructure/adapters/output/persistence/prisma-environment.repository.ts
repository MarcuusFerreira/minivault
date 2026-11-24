import { Injectable } from '@nestjs/common';
import { PrismaContext } from '../../../../../../shared/infrastructure/prisma/prisma-context.js';
import { isUniqueViolation } from '../../../../../../shared/infrastructure/prisma/prisma.service.js';
import type { Environment } from '../../../../domain/entities/environment.entity.js';
import { EnvironmentExistsError } from '../../../../domain/exceptions/environment.errors.js';
import type { EnvironmentRepository } from '../../../../domain/repositories/environment.repository.js';
import type { EnvironmentName } from '../../../../domain/value-objects/environment-name.vo.js';
import { environmentMapper } from './environment.mapper.js';

@Injectable()
export class PrismaEnvironmentRepository implements EnvironmentRepository {
  constructor(private readonly context: PrismaContext) {}

  async add(environment: Environment): Promise<void> {
    try {
      await this.context.client.environment.create({ data: environmentMapper.toRow(environment) });
    } catch (error) {
      if (isUniqueViolation(error)) throw new EnvironmentExistsError();
      throw error;
    }
  }

  async remove(environment: Environment): Promise<boolean> {
    const { count } = await this.context.client.environment.deleteMany({
      where: { id: environment.id, projectId: environment.projectId },
    });
    return count === 1;
  }

  async find(projectId: string, id: string): Promise<Environment | null> {
    const row = await this.context.client.environment.findFirst({ where: { id, projectId } });
    return row && environmentMapper.toDomain(row);
  }

  async findByName(projectId: string, name: EnvironmentName): Promise<Environment | null> {
    const row = await this.context.client.environment.findFirst({ where: { projectId, name: name.value } });
    return row && environmentMapper.toDomain(row);
  }

  async listByProject(projectId: string): Promise<Environment[]> {
    return (await this.context.client.environment.findMany({ where: { projectId } })).map(environmentMapper.toDomain);
  }
}
