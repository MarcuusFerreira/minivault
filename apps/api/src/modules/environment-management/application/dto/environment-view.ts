import type { Environment } from '../../domain/entities/environment.entity.js';
import type { EnvironmentNameText } from '../../domain/value-objects/environment-name.vo.js';

export interface EnvironmentView {
  id: string;
  projectId: string;
  name: EnvironmentNameText;
  createdAt: Date;
}

export function toEnvironmentView({ id, projectId, name, createdAt }: Environment): EnvironmentView {
  return { id, projectId, name: name.value, createdAt };
}
