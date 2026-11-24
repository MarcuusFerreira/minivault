import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
