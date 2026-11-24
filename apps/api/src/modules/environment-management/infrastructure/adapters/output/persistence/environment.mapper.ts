import type { Environment as EnvironmentRow } from '../../../../../../generated/prisma/client.js';
import { Environment } from '../../../../domain/entities/environment.entity.js';
import { EnvironmentName } from '../../../../domain/value-objects/environment-name.vo.js';

export const environmentMapper = {
  toDomain: (row: EnvironmentRow): Environment => Environment.restore({ ...row, name: EnvironmentName.create(row.name) }),
  toRow: ({ id, projectId, name, createdAt }: Environment): EnvironmentRow => ({ id, projectId, name: name.value, createdAt }),
};
