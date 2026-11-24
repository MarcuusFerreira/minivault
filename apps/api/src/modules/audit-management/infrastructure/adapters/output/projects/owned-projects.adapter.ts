import { Inject, Injectable } from '@nestjs/common';
import {
  LIST_OWNED_PROJECT_IDS,
  type ListOwnedProjectIdsPort,
} from '../../../../../project-management/application/ports/input/list-owned-project-ids.port.js';
import type { OwnedProjects } from '../../../../application/ports/output/owned-projects.port.js';

@Injectable()
export class OwnedProjectsAdapter implements OwnedProjects {
  constructor(@Inject(LIST_OWNED_PROJECT_IDS) private readonly list: ListOwnedProjectIdsPort) {}

  idsOf(userId: string): Promise<string[]> {
    return this.list.execute(userId);
  }
}
