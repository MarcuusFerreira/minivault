import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

/** Gives repositories the ambient transaction, or the plain client outside one. */
@Injectable()
export class PrismaContext {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  get client(): Prisma.TransactionClient {
    return this.storage.getStore() ?? this.prisma;
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.storage.getStore()) return work();
    return this.prisma.$transaction((tx) => this.storage.run(tx, work));
  }
}
