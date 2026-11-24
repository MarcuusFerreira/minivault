export interface ProjectStatistics {
  environmentCount: number;
  secretCount: number;
}

/** Read model: counts across contexts, for display only. */
export interface ProjectStatisticsQuery {
  forOwner(ownerId: string): Promise<Map<string, ProjectStatistics>>;
}
export const PROJECT_STATISTICS = Symbol('ProjectStatisticsQuery');
