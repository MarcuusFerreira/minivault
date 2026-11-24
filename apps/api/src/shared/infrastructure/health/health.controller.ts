import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  /** Liveness only: a restart does not fix a database, so no dependency is checked here. */
  @Get('health')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
