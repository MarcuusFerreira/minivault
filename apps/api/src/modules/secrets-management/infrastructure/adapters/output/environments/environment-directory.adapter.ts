import { Inject, Injectable } from '@nestjs/common';
import {
  FIND_ENVIRONMENT,
  type FindEnvironmentPort,
} from '../../../../../environment-management/application/ports/input/find-environment.port.js';
import type { EnvironmentDirectory, EnvironmentReference } from '../../../../application/ports/output/environment-directory.port.js';

@Injectable()
export class EnvironmentDirectoryAdapter implements EnvironmentDirectory {
  constructor(@Inject(FIND_ENVIRONMENT) private readonly environments: FindEnvironmentPort) {}

  byId(projectId: string, environmentId: string): Promise<EnvironmentReference | null> {
    return this.environments.byId(projectId, environmentId);
  }

  byName(projectId: string, name: string): Promise<EnvironmentReference | null> {
    return this.environments.byName(projectId, name);
  }
}
