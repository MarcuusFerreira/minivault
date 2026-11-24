import type { Project as ProjectRow } from '../../../../../../generated/prisma/client.js';
import { Project } from '../../../../domain/entities/project.entity.js';
import { ProjectName } from '../../../../domain/value-objects/project-name.vo.js';

export const projectMapper = {
  toDomain: (row: ProjectRow): Project => Project.restore({ ...row, name: ProjectName.create(row.name) }),
  toRow: (project: Project): ProjectRow => ({
    id: project.id,
    name: project.name.value,
    description: project.description,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }),
};
