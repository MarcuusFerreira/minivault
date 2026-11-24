import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Env } from '../../config/env.js';
import { CLOCK } from '../application/clock.js';
import { DOMAIN_EVENT_PUBLISHER } from '../application/domain-event-publisher.js';
import { ID_GENERATOR } from '../application/id-generator.js';
import { UNIT_OF_WORK } from '../application/unit-of-work.js';
import { InProcessEventBus } from './events/in-process-event-bus.js';
import { PrismaContext } from './prisma/prisma-context.js';
import { PrismaUnitOfWork } from './prisma/prisma-unit-of-work.js';
import { PrismaService } from './prisma/prisma.service.js';

/** Global because every bounded context needs these ports; it holds no feature code. */
@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => new PrismaService(config.get('DATABASE_URL', { infer: true })),
    },
    PrismaContext,
    PrismaUnitOfWork,
    InProcessEventBus,
    { provide: UNIT_OF_WORK, useExisting: PrismaUnitOfWork },
    { provide: DOMAIN_EVENT_PUBLISHER, useExisting: InProcessEventBus },
    { provide: CLOCK, useValue: { now: () => new Date() } },
    { provide: ID_GENERATOR, useValue: { next: () => randomUUID() } },
  ],
  exports: [
    PrismaService,
    PrismaContext,
    PrismaUnitOfWork,
    InProcessEventBus,
    UNIT_OF_WORK,
    DOMAIN_EVENT_PUBLISHER,
    CLOCK,
    ID_GENERATOR,
  ],
})
export class SharedKernelModule {}
