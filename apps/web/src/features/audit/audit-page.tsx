import { AUDIT_ACTIONS } from '@minivault/contracts';
import type { AuditLogResponse } from '@minivault/contracts';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/states';
import { formatDate } from '@/lib/format';
import { auditQuery, projectsQuery } from '@/services/queries';
import { AuditEntryRow } from './audit-entry';
import { ACTION_LABELS } from './audit-labels';
import { useActorNames } from './use-actor-names';

function groupByDay(entries: readonly AuditLogResponse[]): [string, AuditLogResponse[]][] {
  const days = new Map<string, AuditLogResponse[]>();
  for (const entry of entries) {
    const day = formatDate(entry.createdAt);
    const group = days.get(day);
    if (group) group.push(entry);
    else days.set(day, [entry]);
  }
  return [...days];
}

export function Component() {
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') ?? '';
  const action = params.get('action') ?? '';
  const audit = useInfiniteQuery(auditQuery({ projectId, action }));
  const projects = useQuery(projectsQuery());

  const entries = audit.data?.pages.flatMap((page) => page.items) ?? [];
  const actorName = useActorNames(entries);
  const projectNames = new Map(projects.data?.map((project) => [project.id, project.name]));
  const filtered = projectId !== '' || action !== '';

  function filter(name: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      return next;
    });
  }

  return (
    <>
      <PageHeader title="Audit log" />
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Action">
          <Select value={action} onChange={(event) => filter('action', event.target.value)}>
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {ACTION_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Project">
          <Select value={projectId} onChange={(event) => filter('project', event.target.value)}>
            <option value="">All projects</option>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
        {filtered ? (
          <Button variant="secondary" onClick={() => setParams({})}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {audit.isPending ? (
        <LoadingRows label="Loading activity" />
      ) : audit.data === undefined ? (
        <ErrorState error={audit.error} onRetry={() => void audit.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState title={filtered ? 'No activity matches these filters.' : 'No activity yet.'} />
      ) : (
        groupByDay(entries).map(([day, group]) => (
          <section key={day} className="grid gap-5">
            <h2 className="text-lg font-semibold">{day}</h2>
            <ul>
              {group.map((entry) => (
                <AuditEntryRow key={entry.id} entry={entry} actor={actorName(entry)} project={projectNames.get(entry.projectId)} />
              ))}
            </ul>
          </section>
        ))
      )}
      {audit.isFetchNextPageError ? <ErrorState error={audit.error} /> : null}
      {audit.hasNextPage ? (
        <div>
          <Button variant="secondary" disabled={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>
            Load more
          </Button>
        </div>
      ) : null}
    </>
  );
}
