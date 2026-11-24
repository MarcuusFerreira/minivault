import type { ApiKeyResponse } from '@minivault/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/states';
import { formatDate, formatDateTime } from '@/lib/format';
import { api } from '@/services/api-client';
import { apiKeysQuery, environmentsQuery } from '@/services/queries';
import { ApiKeyDialog } from './api-key-dialog';
import { PERMISSION_LABELS } from './generate-api-key-form';

const STATUS = { active: 'Active', expired: 'Expired', revoked: 'Revoked' } as const;
type DialogState = { kind: 'generate' } | { kind: 'rotate' | 'revoke'; key: ApiKeyResponse } | null;

export function Component() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const keys = useQuery(apiKeysQuery(projectId));
  const environments = useQuery(environmentsQuery(projectId));
  const [dialog, setDialog] = useState<DialogState>(null);
  const names = new Map(environments.data?.map(({ id, name }) => [id, name]));
  const close = () => setDialog(null);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'api-keys'] }),
      queryClient.invalidateQueries({ queryKey: ['audit'] }),
    ]);

  return (
    <section aria-labelledby="api-keys" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="api-keys" className="text-xl font-semibold">
          API keys
        </h2>
        <Button disabled={environments.data === undefined} onClick={() => setDialog({ kind: 'generate' })}>
          <Plus aria-hidden />
          Generate API key
        </Button>
      </div>
      {keys.isPending || environments.isPending ? (
        <LoadingRows label="Loading API keys" />
      ) : keys.data === undefined ? (
        <ErrorState error={keys.error} onRetry={() => void keys.refetch()} />
      ) : keys.data.length === 0 ? (
        <EmptyState title="This project has no API keys yet." />
      ) : (
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-3xl text-left">
            <thead className="text-sm text-dim">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Permissions</th>
                <th className="px-4 py-2 font-medium">Expires</th>
                <th className="px-4 py-2 font-medium">Last used</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.data.map((key) => (
                <tr key={key.id} className="align-middle">
                  <th scope="row" className="border-t border-line p-4 font-medium">
                    <span className="break-all">{key.name}</span>
                    <span className="block font-mono text-sm font-normal text-dim">{key.prefix}…</span>
                  </th>
                  <td className={key.status === 'active' ? 'border-t border-line p-4' : 'border-t border-line p-4 text-dim'}>{STATUS[key.status]}</td>
                  <td className="border-t border-line p-4">
                    {key.grants.length === 0 ? <span className="text-dim">None</span> : null}
                    {key.grants.map(({ environmentId, permissions }) => (
                      <span key={environmentId} className="block">
                        {`${names.get(environmentId) ?? 'Deleted environment'}: ${permissions.map((p) => PERMISSION_LABELS[p]).join(', ')}`}
                      </span>
                    ))}
                  </td>
                  <td className="border-t border-line p-4 whitespace-nowrap">{key.expiresAt ? formatDate(key.expiresAt) : 'No expiry'}</td>
                  <td className="border-t border-line p-4 whitespace-nowrap">{key.lastUsedAt ? formatDateTime(key.lastUsedAt) : 'Never'}</td>
                  <td className="border-t border-line p-3">
                    <div className="flex justify-end gap-2">
                      {key.status === 'active' ? (
                        <Button variant="secondary" size="sm" aria-label={`Rotate ${key.name}`} onClick={() => setDialog({ kind: 'rotate', key })}>
                          Rotate
                        </Button>
                      ) : null}
                      {key.status === 'revoked' ? null : (
                        <Button variant="secondary" size="sm" aria-label={`Revoke ${key.name}`} onClick={() => setDialog({ kind: 'revoke', key })}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog?.kind === 'generate' || dialog?.kind === 'rotate' ? (
        <ApiKeyDialog
          projectId={projectId}
          environments={environments.data ?? []}
          {...(dialog.kind === 'rotate' ? { rotating: dialog.key } : {})}
          onIssued={() => void refresh()}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === 'revoke' ? (
        <ConfirmDialog
          title={`Revoke ${dialog.key.name}`}
          description="Applications using this key lose access immediately. It cannot be undone."
          confirmLabel="Revoke key"
          onConfirm={async () => {
            await api<void>(`/projects/${projectId}/api-keys/${dialog.key.id}`, { method: 'DELETE' });
            await refresh();
          }}
          onClose={close}
        />
      ) : null}
    </section>
  );
}
