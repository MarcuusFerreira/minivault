import { Module } from '@nestjs/common';
import { API_KEY_AUTHENTICATOR } from '../../shared/application/authentication.js';
import { CLOCK } from '../../shared/application/clock.js';
import { DOMAIN_EVENT_PUBLISHER } from '../../shared/application/domain-event-publisher.js';
import { ID_GENERATOR } from '../../shared/application/id-generator.js';
import { UNIT_OF_WORK } from '../../shared/application/unit-of-work.js';
import { EnvironmentManagementModule } from '../environment-management/environment-management.module.js';
import { ProjectManagementModule } from '../project-management/project-management.module.js';
import { GENERATE_API_KEY } from './application/ports/input/generate-api-key.port.js';
import { ROTATE_API_KEY } from './application/ports/input/rotate-api-key.port.js';
import { REVOKE_API_KEY } from './application/ports/input/revoke-api-key.port.js';
import { LIST_API_KEYS } from './application/ports/input/list-api-keys.port.js';
import { API_KEY_GENERATOR } from './application/ports/output/api-key-generator.port.js';
import { PROJECT_ACCESS } from './application/ports/output/project-access.port.js';
import { PROJECT_ENVIRONMENTS } from './application/ports/output/project-environments.port.js';
import { GenerateApiKeyUseCase } from './application/use-cases/generate-api-key/generate-api-key.use-case.js';
import { RotateApiKeyUseCase } from './application/use-cases/rotate-api-key/rotate-api-key.use-case.js';
import { RevokeApiKeyUseCase } from './application/use-cases/revoke-api-key/revoke-api-key.use-case.js';
import { ListApiKeysUseCase } from './application/use-cases/list-api-keys/list-api-keys.use-case.js';
import { AuthenticateApiKeyUseCase } from './application/use-cases/authenticate-api-key/authenticate-api-key.use-case.js';
import { API_KEY_REPOSITORY } from './domain/repositories/api-key.repository.js';
import { ApiKeysController } from './infrastructure/adapters/input/http/api-keys.controller.js';
import { ProjectEnvironmentsAdapter } from './infrastructure/adapters/output/environments/project-environments.adapter.js';
import { PrismaApiKeyRepository } from './infrastructure/adapters/output/persistence/prisma-api-key.repository.js';
import { ProjectAccessAdapter } from './infrastructure/adapters/output/projects/project-access.adapter.js';
import { RandomApiKeyGenerator } from './infrastructure/adapters/output/security/random-api-key-generator.adapter.js';

@Module({
  imports: [ProjectManagementModule, EnvironmentManagementModule],
  controllers: [ApiKeysController],
  providers: [
    { provide: API_KEY_REPOSITORY, useClass: PrismaApiKeyRepository },
    { provide: API_KEY_GENERATOR, useClass: RandomApiKeyGenerator },
    { provide: PROJECT_ACCESS, useClass: ProjectAccessAdapter },
    { provide: PROJECT_ENVIRONMENTS, useClass: ProjectEnvironmentsAdapter },
    {
      provide: GENERATE_API_KEY,
      inject: [API_KEY_REPOSITORY, API_KEY_GENERATOR, PROJECT_ACCESS, PROJECT_ENVIRONMENTS, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, ID_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof GenerateApiKeyUseCase>) => new GenerateApiKeyUseCase(...deps),
    },
    {
      provide: ROTATE_API_KEY,
      inject: [API_KEY_REPOSITORY, API_KEY_GENERATOR, PROJECT_ACCESS, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, ID_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof RotateApiKeyUseCase>) => new RotateApiKeyUseCase(...deps),
    },
    {
      provide: REVOKE_API_KEY,
      inject: [API_KEY_REPOSITORY, PROJECT_ACCESS, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof RevokeApiKeyUseCase>) => new RevokeApiKeyUseCase(...deps),
    },
    {
      provide: LIST_API_KEYS,
      inject: [API_KEY_REPOSITORY, PROJECT_ACCESS, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof ListApiKeysUseCase>) => new ListApiKeysUseCase(...deps),
    },
    {
      provide: API_KEY_AUTHENTICATOR,
      inject: [API_KEY_REPOSITORY, API_KEY_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof AuthenticateApiKeyUseCase>) => new AuthenticateApiKeyUseCase(...deps),
    },
  ],
  exports: [API_KEY_AUTHENTICATOR],
})
export class ApiKeyManagementModule {}
