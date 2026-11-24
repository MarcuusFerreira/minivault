import { Injectable } from '@nestjs/common';
import { PrismaContext } from '../../../../../../shared/infrastructure/prisma/prisma-context.js';
import type { ProjectStatistics, ProjectStatisticsQuery } from '../../../../application/ports/output/project-statistics.port.js';

@Injectable()
export class PrismaProjectStatisticsQuery implements ProjectStatisticsQuery {
  constructor(private readonly context: PrismaContext) {}

  async forOwner(ownerId: string): Promise<Map<string, ProjectStatistics>> {
    const rows = await this.context.client.project.findMany({
      where: { ownerId },
      select: { id: true, environments: { select: { _count: { select: { secrets: true } } } } },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          environmentCount: row.environments.length,
          secretCount: row.environments.reduce((total, environment) => total + environment._count.secrets, 0),
        },
      ]),
    );
  }
}
