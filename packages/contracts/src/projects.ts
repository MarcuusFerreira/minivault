import { z } from 'zod';

const name = z.string().trim().min(1).max(100);
const description = z.string().trim().max(500);

export const createProjectRequest = z.strictObject({ name, description: description.default('') });
export type CreateProjectRequest = z.infer<typeof createProjectRequest>;

export const updateProjectRequest = z
  .strictObject({ name: name.optional(), description: description.optional() })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export type UpdateProjectRequest = z.infer<typeof updateProjectRequest>;

export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  environmentCount: number;
  secretCount: number;
  createdAt: string;
  updatedAt: string;
}
