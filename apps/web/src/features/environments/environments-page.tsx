import { ENVIRONMENT_NAMES, type EnvironmentNameValue, type EnvironmentResponse } from '@minivault/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormError } from '@/components/ui/field';
import { ErrorState, LoadingRows } from '@/components/ui/states';
import { formatDate } from '@/lib/format';
import { api, errorMessage } from '@/services/api-client';
import { environmentsQuery } from '@/services/queries';

export function Component() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const { data, error, isPending, refetch } = useQuery(environmentsQuery(projectId));
  const [deleting, setDeleting] = useState<EnvironmentResponse | null>(null);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['audit'] }),
    ]);
  const create = useMutation({
    mutationFn: (name: EnvironmentNameValue) =>
      api<EnvironmentResponse>(`/projects/${projectId}/environments`, { method: 'POST', body: { name } }),
    onSuccess: refresh,
  });
  async function remove(environment: EnvironmentResponse) {
    await api<void>(`/projects/${projectId}/environments/${environment.id}`, { method: 'DELETE' });
    await refresh();
  }

  if (isPending) return <LoadingRows label="Loading environments" />;
  if (data === undefined) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const byName = new Map(data.map((environment) => [environment.name, environment]));

  return (
    <section aria-labelledby="environments" className="grid gap-4">
      <h2 id="environments" className="text-lg font-semibold">
        Environments
      </h2>
      <FormError>{create.isError ? errorMessage(create.error) : undefined}</FormError>
      <ul className="border border-line">
        {ENVIRONMENT_NAMES.map((name) => {
          const environment = byName.get(name);
          return (
            <li key={name} className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 last:border-b-0">
              {environment ? (
                <>
                  <div>
                    <Link className="font-medium underline-offset-4 hover:underline" to={name}>
                      {name}
                    </Link>
                    <p className="text-dim">Created {formatDate(environment.createdAt)}</p>
                  </div>
                  <Button variant="secondary" size="sm" aria-label={`Delete ${name}`} onClick={() => setDeleting(environment)}>
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-dim">{name} (not created)</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Create ${name}`}
                    disabled={create.isPending}
                    onClick={() => create.mutate(name)}
                  >
                    Create
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.name}`}
          description="This deletes every secret of the environment and removes API key access to it. It cannot be undone."
          confirmLabel="Delete environment"
          requireText={deleting.name}
          onConfirm={() => remove(deleting)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </section>
  );
}
