import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common';
import {
  type CreateProjectRequest,
  type ProjectResponse,
  type UpdateProjectRequest,
  createProjectRequest,
  updateProjectRequest,
} from '@minivault/contracts';
import type { RequestContext } from '../../../../../../shared/domain/principal.js';
import { Ctx } from '../../../../../../shared/infrastructure/http/auth/request-context.decorator.js';
import { uuid } from '../../../../../../shared/infrastructure/http/uuid-param.js';
import type { ProjectView } from '../../../../application/dto/project-view.js';
import { CREATE_PROJECT, type CreateProjectPort } from '../../../../application/ports/input/create-project.port.js';
import { DELETE_PROJECT, type DeleteProjectPort } from '../../../../application/ports/input/delete-project.port.js';
import { GET_PROJECT, type GetProjectPort } from '../../../../application/ports/input/get-project.port.js';
import { LIST_PROJECTS, type ListProjectsPort } from '../../../../application/ports/input/list-projects.port.js';
import { UPDATE_PROJECT, type UpdateProjectPort } from '../../../../application/ports/input/update-project.port.js';

const toResponse = (view: ProjectView): ProjectResponse => ({
  ...view,
  createdAt: view.createdAt.toISOString(),
  updatedAt: view.updatedAt.toISOString(),
});

@Controller('projects')
export class ProjectsController {
  constructor(
    @Inject(CREATE_PROJECT) private readonly createProject: CreateProjectPort,
    @Inject(LIST_PROJECTS) private readonly listProjects: ListProjectsPort,
    @Inject(GET_PROJECT) private readonly getProject: GetProjectPort,
    @Inject(UPDATE_PROJECT) private readonly updateProject: UpdateProjectPort,
    @Inject(DELETE_PROJECT) private readonly deleteProject: DeleteProjectPort,
  ) {}

  @Post()
  async create(
    @Ctx() context: RequestContext,
    @Body({ schema: createProjectRequest }) body: CreateProjectRequest,
  ): Promise<ProjectResponse> {
    return toResponse(await this.createProject.execute({ context, ...body }));
  }

  @Get()
  async list(@Ctx() context: RequestContext): Promise<ProjectResponse[]> {
    return (await this.listProjects.execute({ context })).map(toResponse);
  }

  @Get(':projectId')
  async get(@Ctx() context: RequestContext, @Param('projectId', { schema: uuid }) projectId: string): Promise<ProjectResponse> {
    return toResponse(await this.getProject.execute({ context, projectId }));
  }

  @Patch(':projectId')
  async update(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Body({ schema: updateProjectRequest }) body: UpdateProjectRequest,
  ): Promise<ProjectResponse> {
    return toResponse(await this.updateProject.execute({ context, projectId, ...body }));
  }

  @Delete(':projectId')
  @HttpCode(204)
  async remove(@Ctx() context: RequestContext, @Param('projectId', { schema: uuid }) projectId: string): Promise<void> {
    await this.deleteProject.execute({ context, projectId });
  }
}
