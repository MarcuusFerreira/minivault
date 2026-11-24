import { Module } from '@nestjs/common';
import { CLOCK } from '../../shared/application/clock.js';
import { DOMAIN_EVENT_PUBLISHER } from '../../shared/application/domain-event-publisher.js';
import { ID_GENERATOR } from '../../shared/application/id-generator.js';
import { UNIT_OF_WORK } from '../../shared/application/unit-of-work.js';
import { AUTHORIZE_PROJECT_ACCESS } from './application/ports/input/authorize-project-access.port.js';
import { CREATE_PROJECT } from './application/ports/input/create-project.port.js';
import { DELETE_PROJECT } from './application/ports/input/delete-project.port.js';
import { GET_PROJECT } from './application/ports/input/get-project.port.js';
import { LIST_OWNED_PROJECT_IDS } from './application/ports/input/list-owned-project-ids.port.js';
import { LIST_PROJECTS } from './application/ports/input/list-projects.port.js';
import { UPDATE_PROJECT } from './application/ports/input/update-project.port.js';
import { PROJECT_STATISTICS } from './application/ports/output/project-statistics.port.js';
import { AuthorizeProjectAccessUseCase } from './application/use-cases/authorize-project-access/authorize-project-access.use-case.js';
import { CreateProjectUseCase } from './application/use-cases/create-project/create-project.use-case.js';
import { DeleteProjectUseCase } from './application/use-cases/delete-project/delete-project.use-case.js';
import { GetProjectUseCase } from './application/use-cases/get-project/get-project.use-case.js';
import { ListOwnedProjectIdsUseCase } from './application/use-cases/list-owned-project-ids/list-owned-project-ids.use-case.js';
import { ListProjectsUseCase } from './application/use-cases/list-projects/list-projects.use-case.js';
import { UpdateProjectUseCase } from './application/use-cases/update-project/update-project.use-case.js';
import { PROJECT_REPOSITORY } from './domain/repositories/project.repository.js';
import { ProjectsController } from './infrastructure/adapters/input/http/projects.controller.js';
import { PrismaProjectStatisticsQuery } from './infrastructure/adapters/output/persistence/prisma-project-statistics.query.js';
import { PrismaProjectRepository } from './infrastructure/adapters/output/persistence/prisma-project.repository.js';

@Module({
  controllers: [ProjectsController],
  providers: [
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: PROJECT_STATISTICS, useClass: PrismaProjectStatisticsQuery },
    {
      provide: CREATE_PROJECT,
      inject: [PROJECT_REPOSITORY, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, ID_GENERATOR, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof CreateProjectUseCase>) => new CreateProjectUseCase(...deps),
    },
    {
      provide: LIST_PROJECTS,
      inject: [PROJECT_REPOSITORY, PROJECT_STATISTICS],
      useFactory: (...deps: ConstructorParameters<typeof ListProjectsUseCase>) => new ListProjectsUseCase(...deps),
    },
    {
      provide: GET_PROJECT,
      inject: [PROJECT_REPOSITORY, PROJECT_STATISTICS],
      useFactory: (...deps: ConstructorParameters<typeof GetProjectUseCase>) => new GetProjectUseCase(...deps),
    },
    {
      provide: UPDATE_PROJECT,
      inject: [PROJECT_REPOSITORY, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, PROJECT_STATISTICS, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof UpdateProjectUseCase>) => new UpdateProjectUseCase(...deps),
    },
    {
      provide: DELETE_PROJECT,
      inject: [PROJECT_REPOSITORY, UNIT_OF_WORK, DOMAIN_EVENT_PUBLISHER, CLOCK],
      useFactory: (...deps: ConstructorParameters<typeof DeleteProjectUseCase>) => new DeleteProjectUseCase(...deps),
    },
    {
      provide: AUTHORIZE_PROJECT_ACCESS,
      inject: [PROJECT_REPOSITORY],
      useFactory: (...deps: ConstructorParameters<typeof AuthorizeProjectAccessUseCase>) => new AuthorizeProjectAccessUseCase(...deps),
    },
    {
      provide: LIST_OWNED_PROJECT_IDS,
      inject: [PROJECT_REPOSITORY],
      useFactory: (...deps: ConstructorParameters<typeof ListOwnedProjectIdsUseCase>) => new ListOwnedProjectIdsUseCase(...deps),
    },
  ],
  exports: [AUTHORIZE_PROJECT_ACCESS, LIST_OWNED_PROJECT_IDS],
})
export class ProjectManagementModule {}
