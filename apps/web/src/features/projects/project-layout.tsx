import type { ProjectResponse } from '@minivault/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, LoadingRows } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { ApiError, api } from '@/services/api-client';
import { environmentsQuery, projectQuery } from '@/services/queries';
import { ProjectFormDialog } from './project-form-dialog';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap', isActive ? 'bg-hover text-ink' : 'text-dim hover:text-ink');

export function Component() {
  const { projectId = '' } = useParams();
  const project = useQuery(projectQuery(projectId));
  // Requested alongside the project rather than after it.
  const environments = useQuery(environmentsQuery(projectId));

  if (project.data) return <ProjectView project={project.data} environmentNames={environments.data?.map((e) => e.name) ?? []} />;
  if (project.isPending) return <LoadingRows label="Loading project" />;
  const missing = project.error instanceof ApiError && project.error.status < 500 && project.error.status > 0;
  return missing ? (
    <ErrorState error={project.error} />
  ) : (
    <ErrorState error={project.error} onRetry={() => void project.refetch()} />
  );
}

function ProjectView({ project, environmentNames }: { project: ProjectResponse; environmentNames: string[] }) {
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const close = () => setDialog(null);

  async function remove() {
    await api<void>(`/projects/${project.id}`, { method: 'DELETE' });
    await navigate('/projects');
    queryClient.removeQueries({ queryKey: ['projects', project.id] });
    await queryClient.invalidateQueries({ queryKey: ['projects'], exact: true });
    await queryClient.invalidateQueries({ queryKey: ['audit'] });
  }

  return (
    <>
      <PageHeader title={project.name} description={project.description}>
        <Button variant="secondary" onClick={() => setDialog('edit')}>
          <Pencil aria-hidden />
          Edit
        </Button>
        <Button variant="ghost" onClick={() => setDialog('delete')}>
          <Trash2 aria-hidden />
          Delete project
        </Button>
      </PageHeader>
      <nav aria-label="Project" className="flex max-w-full gap-1 justify-self-start overflow-x-auto rounded-full bg-ground p-1">
        <NavLink end to={`/projects/${project.id}`} className={tabClass}>
          Overview
        </NavLink>
        {environmentNames.map((name) => (
          <NavLink key={name} to={`/projects/${project.id}/${name}`} className={tabClass}>
            {name}
          </NavLink>
        ))}
        <NavLink to={`/projects/${project.id}/api-keys`} className={tabClass}>
          API keys
        </NavLink>
      </nav>
      <Outlet />
      {dialog === 'edit' ? <ProjectFormDialog project={project} onClose={close} onSaved={close} /> : null}
      {dialog === 'delete' ? (
        <ConfirmDialog
          title="Delete project"
          description="This deletes every environment, secret and API key of the project. It cannot be undone."
          confirmLabel="Delete project"
          requireText={project.name}
          onConfirm={remove}
          onClose={close}
        />
      ) : null}
    </>
  );
}
