import type { Project } from '../../domain/entities/project.entity.js';
import type { ProjectStatistics } from '../ports/output/project-statistics.port.js';

export interface ProjectView extends ProjectStatistics {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toProjectView(project: Project, statistics?: ProjectStatistics): ProjectView {
  return {
    id: project.id,
    name: project.name.value,
    description: project.description,
    environmentCount: statistics?.environmentCount ?? 0,
    secretCount: statistics?.secretCount ?? 0,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
