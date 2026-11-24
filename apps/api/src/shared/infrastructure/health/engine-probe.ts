import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.js';

@Injectable()
export class EngineProbe {
  private readonly url: string;

  constructor(config: ConfigService<Env, true>) {
    this.url = `${config.get('ENGINE_URL', { infer: true })}/health`;
  }

  async check(): Promise<void> {
    const response = await fetch(this.url, { signal: AbortSignal.timeout(2000) });
    await response.body?.cancel();
    if (!response.ok) throw new Error('engine is not healthy');
  }
}
