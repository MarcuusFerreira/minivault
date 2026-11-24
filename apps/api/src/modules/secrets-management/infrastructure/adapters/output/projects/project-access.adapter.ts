import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../../../../../shared/domain/principal.js';
import {
  AUTHORIZE_PROJECT_ACCESS,
  type AuthorizeProjectAccessPort,
} from '../../../../../project-management/application/ports/input/authorize-project-access.port.js';
import type { ProjectAccess } from '../../../../application/ports/output/project-access.port.js';

@Injectable()
export class ProjectAccessAdapter implements ProjectAccess {
  constructor(@Inject(AUTHORIZE_PROJECT_ACCESS) private readonly authorize: AuthorizeProjectAccessPort) {}

  assert(principal: Principal, projectId: string): Promise<void> {
    return this.authorize.execute({ principal, projectId });
  }
}
