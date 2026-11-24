import { Controller, Get, Header, Inject, Query } from '@nestjs/common';
import { type MachineSecretsQuery, type MachineSecretsResponse, machineSecretsQuery } from '@minivault/contracts';
import type { RequestContext } from '../../../../../../shared/domain/principal.js';
import { AllowApiKey } from '../../../../../../shared/infrastructure/http/auth/allow-api-key.decorator.js';
import { Ctx } from '../../../../../../shared/infrastructure/http/auth/request-context.decorator.js';
import {
  RETRIEVE_ENVIRONMENT_SECRETS,
  type RetrieveEnvironmentSecretsPort,
} from '../../../../application/ports/input/retrieve-environment-secrets.port.js';

@AllowApiKey('only')
@Controller('machine/secrets')
export class MachineSecretsController {
  constructor(
    @Inject(RETRIEVE_ENVIRONMENT_SECRETS) private readonly retrieveEnvironmentSecrets: RetrieveEnvironmentSecretsPort,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Ctx() context: RequestContext,
    @Query({ schema: machineSecretsQuery }) query: MachineSecretsQuery,
  ): Promise<MachineSecretsResponse> {
    const secrets = await this.retrieveEnvironmentSecrets.execute({
      context,
      environmentName: query.environment,
      keys: query.keys?.split(',') ?? null,
    });
    return { environment: query.environment, secrets: Object.fromEntries(secrets.map(({ key, value }) => [key, value])) };
  }
}
