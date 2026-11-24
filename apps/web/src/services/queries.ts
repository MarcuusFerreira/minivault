import type {
  ApiKeyResponse,
  AuditLogPage,
  EnvironmentResponse,
  ProjectResponse,
  SecretMetadataResponse,
} from '@minivault/contracts';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { api } from './api-client';

export const projectsQuery = () => queryOptions({ queryKey: ['projects'], queryFn: () => api<ProjectResponse[]>('/projects') });

export const projectQuery = (projectId: string) =>
  queryOptions({ queryKey: ['projects', projectId], queryFn: () => api<ProjectResponse>(`/projects/${projectId}`) });

export const environmentsQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['projects', projectId, 'environments'],
    queryFn: () => api<EnvironmentResponse[]>(`/projects/${projectId}/environments`),
  });

export const secretsPath = (projectId: string, environmentId: string) =>
  `/projects/${projectId}/environments/${environmentId}/secrets`;

/** Metadata only. */
export const secretsQuery = (projectId: string, environmentId: string) =>
  queryOptions({
    queryKey: ['projects', projectId, 'environments', environmentId, 'secrets'],
    queryFn: () => api<SecretMetadataResponse[]>(secretsPath(projectId, environmentId)),
  });

/** Metadata only. */
export const apiKeysQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['projects', projectId, 'api-keys'],
    queryFn: () => api<ApiKeyResponse[]>(`/projects/${projectId}/api-keys`),
  });

export const recentActivityQuery = () =>
  queryOptions({ queryKey: ['audit', 'recent'], queryFn: () => api<AuditLogPage>('/audit-logs?limit=10') });

export const auditQuery = (filters: { projectId: string; action: string }) =>
  infiniteQueryOptions({
    queryKey: ['audit', 'list', filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '25' });
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.action) params.set('action', filters.action);
      if (pageParam) params.set('cursor', pageParam);
      return api<AuditLogPage>(`/audit-logs?${params}`);
    },
    initialPageParam: '',
    getNextPageParam: (page) => page.nextCursor,
  });
