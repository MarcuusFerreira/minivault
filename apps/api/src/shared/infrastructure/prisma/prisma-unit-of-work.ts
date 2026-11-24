import { Injectable } from '@nestjs/common';
import type { UnitOfWork } from '../../application/unit-of-work.js';
import { PrismaContext } from './prisma-context.js';

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly context: PrismaContext) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.context.transaction(work);
  }
}
