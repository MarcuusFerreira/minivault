import { Inject, Injectable } from '@nestjs/common';
import {
  FIND_ENVIRONMENT,
  type FindEnvironmentPort,
} from '../../../../../environment-management/application/ports/input/find-environment.port.js';
import type { ProjectEnvironments } from '../../../../application/ports/output/project-environments.port.js';

@Injectable()
export class ProjectEnvironmentsAdapter implements ProjectEnvironments {
  constructor(@Inject(FIND_ENVIRONMENT) private readonly environments: FindEnvironmentPort) {}

  async exists(projectId: string, environmentId: string): Promise<boolean> {
    return (await this.environments.byId(projectId, environmentId)) !== null;
  }
}
