import type { ProjectResponse } from '@minivault/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/states';
import { AuditEntryRow } from '@/features/audit/audit-entry';
import { useActorNames } from '@/features/audit/use-actor-names';
import { CreateProjectButton } from '@/features/projects/create-project-button';
import { ProjectList } from '@/features/projects/project-list';
import { projectsQuery, recentActivityQuery } from '@/services/queries';

function totals(projects: readonly ProjectResponse[]): [string, number][] {
  let environments = 0;
  let secrets = 0;
  for (const project of projects) {
    environments += project.environmentCount;
    secrets += project.secretCount;
  }
  return [
    ['Projects', projects.length],
    ['Environments', environments],
    ['Secrets', secrets],
  ];
}

export function Component() {
  const projects = useQuery(projectsQuery());
  const activity = useQuery(recentActivityQuery());
  const entries = activity.data?.items ?? [];
  const actorName = useActorNames(entries);
  const projectNames = new Map(projects.data?.map((project) => [project.id, project.name]));

  return (
    <>
      <PageHeader title="Dashboard" />
      {projects.isPending ? (
        <LoadingRows label="Loading projects" />
      ) : projects.data === undefined ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : projects.data.length === 0 ? (
        <EmptyState title="You have no projects yet.">
          <p className="text-dim">A project groups the secrets of one application.</p>
          <CreateProjectButton />
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {totals(projects.data).map(([label, count]) => (
              <div key={label} role="group" aria-label={label} className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold">{count}</p>
                <p className="text-dim">{count === 1 ? label.slice(0, -1) : label}</p>
              </div>
            ))}
          </div>
          <section aria-labelledby="dashboard-projects" className="grid gap-5">
            <h2 id="dashboard-projects" className="text-xl font-semibold">
              Projects
            </h2>
            <ProjectList projects={projects.data.slice(0, 5)} />
          </section>
        </>
      )}
      <section aria-labelledby="recent-activity" className="grid gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="recent-activity" className="text-xl font-semibold">
            Recent activity
          </h2>
          <Link className="text-sm text-dim underline underline-offset-4 hover:text-ink" to="/audit">
            View all activity
          </Link>
        </div>
        {activity.isPending ? (
          <LoadingRows label="Loading activity" />
        ) : activity.data === undefined ? (
          <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState title="No activity yet." />
        ) : (
          <ul>
            {entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} actor={actorName(entry)} project={projectNames.get(entry.projectId)} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
