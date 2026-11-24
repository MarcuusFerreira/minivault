import { Module } from '@nestjs/common';
import { CLOCK } from '../../shared/application/clock.js';
import { DOMAIN_EVENT_PUBLISHER } from '../../shared/application/domain-event-publisher.js';
import { ID_GENERATOR } from '../../shared/application/id-generator.js';
import { UNIT_OF_WORK } from '../../shared/application/unit-of-work.js';
import { ProjectManagementModule } from '../project-management/project-management.module.js';
import { CREATE_ENVIRONMENT } from './application/ports/input/create-environment.port.js';
import { LIST_ENVIRONMENTS } from './application/ports/input/list-environments.port.js';
import { GET_ENVIRONMENT } from './application/ports/input/get-environment.port.js';
import { DELETE_ENVIRONMENT } from './application/ports/input/delete-environment.port.js';
import { PROVISION_DEFAULT_ENVIRONMENTS } from './application/ports/input/provision-default-environments.port.js';
import { FIND_ENVIRONMENT } from './application/ports/input/find-environment.port.js';
import { PROJECT_ACCESS } from './application/ports/output/project-access.port.js';
import { CreateEnvironmentUseCase } from './application/use-cases/create-environment/create-environment.use-case.js';
import { ListEnvironmentsUseCase } from './application/use-cases/list-environments/list-environments.use-case.js';
import { GetEnvironmentUseCase } from './application/use-cases/get-environment/get-environment.use-case.js';
import { DeleteEnvironmentUseCase } from './application/use-cases/delete-environment/delete-environment.use-case.js';
import { ProvisionDefaultEnvironmentsUseCase } from './application/use-cases/provision-default-environments/provision-default-environments.use-case.js';
import { FindEnvironmentUseCase } from './application/use-cases/find-environment/find-environment.use-case.js';
import { ENVIRONMENT_REPOSITORY } from './domain/repositories/environment.repository.js';
import { ProjectCreatedSubscriber } from './infrastructure/adapters/input/events/project-created.subscriber.js';
import { EnvironmentsController } from './infrastructure/adapters/input/http/environments.controller.js';
import { PrismaEnvironmentRepository } from './infrastructure/adapters/output/persistence/prisma-environment.repository.js';
import { ProjectAccessAdapter } from './infrastructure/adapters/output/projects/project-access.adapter.js';

@Module({
  imports: [ProjectManagementModule],
  controllers: [EnvironmentsController],
  providers: [
    ProjectCreatedSubscriber,
    { provide: ENVIRONMENT_REPOSITORY, useClass: PrismaEnvironmentRepository },
    { provide: PROJECT_ACCESS, useClass: ProjectAccessAdapter },
    {
      provide: CREATE_ENVIRONMENT,
      inject: [ENVIRONMENT_REPOSITORY, PROJECT_ACCESS, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, ID_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof CreateEnvironmentUseCase>) => new CreateEnvironmentUseCase(...deps),
    },
    {
      provide: LIST_ENVIRONMENTS,
      inject: [ENVIRONMENT_REPOSITORY, PROJECT_ACCESS],
      useFactory: (...deps: ConstructorParameters<typeof ListEnvironmentsUseCase>) => new ListEnvironmentsUseCase(...deps),
    },
    {
      provide: GET_ENVIRONMENT,
      inject: [ENVIRONMENT_REPOSITORY, PROJECT_ACCESS],
      useFactory: (...deps: ConstructorParameters<typeof GetEnvironmentUseCase>) => new GetEnvironmentUseCase(...deps),
    },
    {
      provide: DELETE_ENVIRONMENT,
      inject: [ENVIRONMENT_REPOSITORY, PROJECT_ACCESS, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof DeleteEnvironmentUseCase>) => new DeleteEnvironmentUseCase(...deps),
    },
    {
      provide: PROVISION_DEFAULT_ENVIRONMENTS,
      inject: [ENVIRONMENT_REPOSITORY, DOMAIN_EVENT_PUBLISHER, ID_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof ProvisionDefaultEnvironmentsUseCase>) => new ProvisionDefaultEnvironmentsUseCase(...deps),
    },
    {
      provide: FIND_ENVIRONMENT,
      inject: [ENVIRONMENT_REPOSITORY],
      useFactory: (...deps: ConstructorParameters<typeof FindEnvironmentUseCase>) => new FindEnvironmentUseCase(...deps),
    },
  ],
  exports: [FIND_ENVIRONMENT],
})
export class EnvironmentManagementModule {}
