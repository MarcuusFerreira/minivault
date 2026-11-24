import { Injectable } from '@nestjs/common';
import { PrismaContext } from '../../../../../../shared/infrastructure/prisma/prisma-context.js';
import { isUniqueViolation } from '../../../../../../shared/infrastructure/prisma/prisma.service.js';
import type { Project } from '../../../../domain/entities/project.entity.js';
import { ProjectNameTakenError } from '../../../../domain/exceptions/project.errors.js';
import type { ProjectRepository } from '../../../../domain/repositories/project.repository.js';
import { projectMapper } from './project.mapper.js';

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly context: PrismaContext) {}

  async add(project: Project): Promise<void> {
    await this.rejectDuplicates(this.context.client.project.create({ data: projectMapper.toRow(project) }));
  }

  async save(project: Project): Promise<boolean> {
    const { name, description, updatedAt } = projectMapper.toRow(project);
    const { count } = await this.rejectDuplicates(
      this.context.client.project.updateMany({
        where: { id: project.id, ownerId: project.ownerId },
        data: { name, description, updatedAt },
      }),
    );
    return count === 1;
  }

  async remove(project: Project): Promise<boolean> {
    const { count } = await this.context.client.project.deleteMany({ where: { id: project.id, ownerId: project.ownerId } });
    return count === 1;
  }

  async findById(id: string): Promise<Project | null> {
    const row = await this.context.client.project.findUnique({ where: { id } });
    return row && projectMapper.toDomain(row);
  }

  async listByOwner(ownerId: string): Promise<Project[]> {
    const rows = await this.context.client.project.findMany({ where: { ownerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return rows.map(projectMapper.toDomain);
  }

  private async rejectDuplicates<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ProjectNameTakenError();
      throw error;
    }
  }
}
