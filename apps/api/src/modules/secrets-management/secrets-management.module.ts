import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { CLOCK } from '../../shared/application/clock.js';
import { DOMAIN_EVENT_PUBLISHER } from '../../shared/application/domain-event-publisher.js';
import { ID_GENERATOR } from '../../shared/application/id-generator.js';
import { UNIT_OF_WORK } from '../../shared/application/unit-of-work.js';
import { EnvironmentManagementModule } from '../environment-management/environment-management.module.js';
import { ProjectManagementModule } from '../project-management/project-management.module.js';
import { STORE_SECRET } from './application/ports/input/store-secret.port.js';
import { UPDATE_SECRET } from './application/ports/input/update-secret.port.js';
import { RETRIEVE_ENVIRONMENT_SECRETS } from './application/ports/input/retrieve-environment-secrets.port.js';
import { RETRIEVE_SECRET } from './application/ports/input/retrieve-secret.port.js';
import { RETRIEVE_SECRETS } from './application/ports/input/retrieve-secrets.port.js';
import { LIST_SECRET_METADATA } from './application/ports/input/list-secret-metadata.port.js';
import { DELETE_SECRET } from './application/ports/input/delete-secret.port.js';
import { ENCRYPTION } from './application/ports/output/encryption.port.js';
import { ENVIRONMENT_DIRECTORY } from './application/ports/output/environment-directory.port.js';
import { PROJECT_ACCESS } from './application/ports/output/project-access.port.js';
import { SecretAccessPolicy } from './application/services/secret-access.policy.js';
import { StoreSecretUseCase } from './application/use-cases/store-secret/store-secret.use-case.js';
import { UpdateSecretUseCase } from './application/use-cases/update-secret/update-secret.use-case.js';
import { RetrieveEnvironmentSecretsUseCase } from './application/use-cases/retrieve-environment-secrets/retrieve-environment-secrets.use-case.js';
import { RetrieveSecretUseCase } from './application/use-cases/retrieve-secret/retrieve-secret.use-case.js';
import { RetrieveSecretsUseCase } from './application/use-cases/retrieve-secrets/retrieve-secrets.use-case.js';
import { ListSecretMetadataUseCase } from './application/use-cases/list-secret-metadata/list-secret-metadata.use-case.js';
import { DeleteSecretUseCase } from './application/use-cases/delete-secret/delete-secret.use-case.js';
import { SECRET_REPOSITORY } from './domain/repositories/secret.repository.js';
import { MachineSecretsController } from './infrastructure/adapters/input/http/machine-secrets.controller.js';
import { SecretsController } from './infrastructure/adapters/input/http/secrets.controller.js';
import { GoCryptoAdapter } from './infrastructure/adapters/output/cryptography/go-crypto.adapter.js';
import { EnvironmentDirectoryAdapter } from './infrastructure/adapters/output/environments/environment-directory.adapter.js';
import { PrismaSecretRepository } from './infrastructure/adapters/output/persistence/prisma-secret.repository.js';
import { ProjectAccessAdapter } from './infrastructure/adapters/output/projects/project-access.adapter.js';

@Module({
  imports: [ProjectManagementModule, EnvironmentManagementModule],
  controllers: [SecretsController, MachineSecretsController],
  providers: [
    { provide: SECRET_REPOSITORY, useClass: PrismaSecretRepository },
    { provide: PROJECT_ACCESS, useClass: ProjectAccessAdapter },
    { provide: ENVIRONMENT_DIRECTORY, useClass: EnvironmentDirectoryAdapter },
    {
      provide: ENCRYPTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new GoCryptoAdapter({
          baseUrl: config.get('ENGINE_URL', { infer: true }),
          token: config.get('ENGINE_AUTH_TOKEN', { infer: true }),
          timeoutMs: config.get('ENGINE_TIMEOUT_MS', { infer: true }),
        }),
    },
    {
      provide: SecretAccessPolicy,
      inject: [PROJECT_ACCESS, ENVIRONMENT_DIRECTORY],
      useFactory: (...deps: ConstructorParameters<typeof SecretAccessPolicy>) => new SecretAccessPolicy(...deps),
    },
    {
      provide: STORE_SECRET,
      inject: [SECRET_REPOSITORY, ENCRYPTION, SecretAccessPolicy, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, ID_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof StoreSecretUseCase>) => new StoreSecretUseCase(...deps),
    },
    {
      provide: UPDATE_SECRET,
      inject: [SECRET_REPOSITORY, ENCRYPTION, SecretAccessPolicy, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof UpdateSecretUseCase>) => new UpdateSecretUseCase(...deps),
    },
    {
      provide: RETRIEVE_SECRET,
      inject: [SECRET_REPOSITORY, ENCRYPTION, SecretAccessPolicy, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof RetrieveSecretUseCase>) => new RetrieveSecretUseCase(...deps),
    },
    {
      provide: RETRIEVE_SECRETS,
      inject: [SECRET_REPOSITORY, ENCRYPTION, SecretAccessPolicy, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof RetrieveSecretsUseCase>) => new RetrieveSecretsUseCase(...deps),
    },
    {
      provide: LIST_SECRET_METADATA,
      inject: [SECRET_REPOSITORY, SecretAccessPolicy],
      useFactory: (...deps: ConstructorParameters<typeof ListSecretMetadataUseCase>) => new ListSecretMetadataUseCase(...deps),
    },
    {
      provide: DELETE_SECRET,
      inject: [SECRET_REPOSITORY, SecretAccessPolicy, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof DeleteSecretUseCase>) => new DeleteSecretUseCase(...deps),
    },
    {
      provide: RETRIEVE_ENVIRONMENT_SECRETS,
      inject: [ENVIRONMENT_DIRECTORY, RETRIEVE_SECRETS],
      useFactory: (...deps: ConstructorParameters<typeof RetrieveEnvironmentSecretsUseCase>) =>
        new RetrieveEnvironmentSecretsUseCase(...deps),
    },
  ],
})
export class SecretsManagementModule {}
