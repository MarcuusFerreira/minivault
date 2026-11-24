import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { type CreateEnvironmentRequest, type EnvironmentResponse, createEnvironmentRequest } from '@minivault/contracts';
import type { RequestContext } from '../../../../../../shared/domain/principal.js';
import { Ctx } from '../../../../../../shared/infrastructure/http/auth/request-context.decorator.js';
import { uuid } from '../../../../../../shared/infrastructure/http/uuid-param.js';
import type { EnvironmentView } from '../../../../application/dto/environment-view.js';
import { CREATE_ENVIRONMENT, type CreateEnvironmentPort } from '../../../../application/ports/input/create-environment.port.js';
import { DELETE_ENVIRONMENT, type DeleteEnvironmentPort } from '../../../../application/ports/input/delete-environment.port.js';
import { GET_ENVIRONMENT, type GetEnvironmentPort } from '../../../../application/ports/input/get-environment.port.js';
import { LIST_ENVIRONMENTS, type ListEnvironmentsPort } from '../../../../application/ports/input/list-environments.port.js';

const toResponse = (view: EnvironmentView): EnvironmentResponse => ({ ...view, createdAt: view.createdAt.toISOString() });

@Controller('projects/:projectId/environments')
export class EnvironmentsController {
  constructor(
    @Inject(CREATE_ENVIRONMENT) private readonly createEnvironment: CreateEnvironmentPort,
    @Inject(LIST_ENVIRONMENTS) private readonly listEnvironments: ListEnvironmentsPort,
    @Inject(GET_ENVIRONMENT) private readonly getEnvironment: GetEnvironmentPort,
    @Inject(DELETE_ENVIRONMENT) private readonly deleteEnvironment: DeleteEnvironmentPort,
  ) {}

  @Post()
  async create(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Body({ schema: createEnvironmentRequest }) body: CreateEnvironmentRequest,
  ): Promise<EnvironmentResponse> {
    return toResponse(await this.createEnvironment.execute({ context, projectId, name: body.name }));
  }

  @Get()
  async list(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
  ): Promise<EnvironmentResponse[]> {
    return (await this.listEnvironments.execute({ context, projectId })).map(toResponse);
  }

  @Get(':environmentId')
  async get(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
  ): Promise<EnvironmentResponse> {
    return toResponse(await this.getEnvironment.execute({ context, projectId, environmentId }));
  }

  @Delete(':environmentId')
  @HttpCode(204)
  async remove(
    @Ctx() context: RequestContext,
    @Param('projectId', { schema: uuid }) projectId: string,
    @Param('environmentId', { schema: uuid }) environmentId: string,
  ): Promise<void> {
    await this.deleteEnvironment.execute({ context, projectId, environmentId });
  }
}
