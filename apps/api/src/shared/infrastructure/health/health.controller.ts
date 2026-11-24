import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../http/auth/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EngineProbe } from './engine-probe.js';

@Public()
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineProbe,
  ) {}

  /** Liveness only: a restart does not fix a database, so no dependency is checked here. */
  @Get('health')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    try {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, this.engine.check()]);
    } catch {
      throw new ServiceUnavailableException();
    }
    return { status: 'ok' };
  }
}
