import type { EnvironmentResponse, SecretMetadataResponse, SecretValueResponse } from '@minivault/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingRows } from '@/components/ui/states';
import { formatDateTime } from '@/lib/format';
import { api, errorMessage } from '@/services/api-client';
import { environmentsQuery, secretsPath, secretsQuery } from '@/services/queries';
import { Plaintext } from './plaintext';
import { useRevealedSecrets } from './revealed-secrets-context';
import { SecretFormDialog } from './secret-form-dialog';

/** Constant, so it says nothing about the value's length. */
const MASK = '••••••••';

export function Component() {
  const { projectId = '', environmentName = '' } = useParams();
  const { data, error, isPending, refetch } = useQuery(environmentsQuery(projectId));
  if (isPending) return <LoadingRows label="Loading environments" />;
  if (data === undefined) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const environment = data.find(({ name }) => name === environmentName);
  return environment ? (
    <EnvironmentSecrets key={environment.id} projectId={projectId} environment={environment} />
  ) : (
    <EmptyState title={`This project has no ${environmentName} environment.`} />
  );
}

type DialogState = { kind: 'create' } | { kind: 'edit' | 'delete'; secret: SecretMetadataResponse } | null;

function EnvironmentSecrets({ projectId, environment }: { projectId: string; environment: EnvironmentResponse }) {
  const path = secretsPath(projectId, environment.id);
  const queryClient = useQueryClient();
  const revealed = useRevealedSecrets();
  const { data, error, isPending, refetch } = useQuery(secretsQuery(projectId, environment.id));
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [failure, setFailure] = useState<string>();
  const [notice, setNotice] = useState('');
  const term = useDeferredValue(search).trim().toUpperCase();
  const matches = term ? data?.filter(({ key }) => key.includes(term)) : data;
  const close = () => setDialog(null);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['audit'] }),
    ]);
  }
  const read = async (secret: SecretMetadataResponse) =>
    (await api<SecretValueResponse>(`${path}/${secret.id}`)).value;

  async function toggle(secret: SecretMetadataResponse) {
    if (revealed.values.has(secret.id)) {
      revealed.hide(secret.id);
      return;
    }
    setFailure(undefined);
    const show = revealed.beginReveal();
    try {
      show(secret.id, await read(secret));
      void queryClient.invalidateQueries({ queryKey: ['audit'] });
    } catch (problem) {
      setFailure(errorMessage(problem));
    }
  }

  async function copy(secret: SecretMetadataResponse) {
    setFailure(undefined);
    setNotice('');
    let value: string;
    try {
      value = await read(secret);
    } catch (problem) {
      setFailure(errorMessage(problem));
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`Copied ${secret.key}.`);
    } catch {
      setFailure(`${secret.key} could not be copied. Allow clipboard access and try again.`);
    }
  }

  return (
    <section aria-label={`${environment.name} secrets`} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          type="search"
          aria-label="Search secrets"
          placeholder="Search by key"
          className="max-w-xs"
          spellCheck={false}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button onClick={() => setDialog({ kind: 'create' })}>
          <Plus aria-hidden />
          Create secret
        </Button>
      </div>
      <FormError>{failure}</FormError>
      <p role="status" className="sr-only">
        {notice}
      </p>
      {isPending ? (
        <LoadingRows label="Loading secrets" />
      ) : matches === undefined ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : matches.length === 0 ? (
        <EmptyState title={term ? 'No secret matches your search.' : `${environment.name} has no secrets yet.`} />
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-2xl text-left">
            <thead className="border-b border-line text-dim">
              <tr>
                <th className="p-4 font-medium">Key</th>
                <th className="p-4 font-medium">Value</th>
                <th className="p-4 font-medium">Updated</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((secret) => {
                const value = revealed.values.get(secret.id);
                const shown = value !== undefined;
                return (
                  <tr key={secret.id} className="border-b border-line align-top last:border-b-0 hover:bg-raised">
                    <th scope="row" className="p-4 font-medium break-all">
                      {secret.key}
                    </th>
                    <td className="w-2/5 p-4">
                      {shown ? <Plaintext value={value} label={`Value of ${secret.key}`} /> : <span className="text-dim">{MASK}</span>}
                    </td>
                    <td className="p-4 whitespace-nowrap text-dim">{formatDateTime(secret.updatedAt)}</td>
                    <td className="p-2">
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" title={shown ? 'Hide' : 'Reveal'} aria-label={`${shown ? 'Hide' : 'Reveal'} ${secret.key}`} onClick={() => void toggle(secret)}>
                          {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Copy" aria-label={`Copy ${secret.key}`} onClick={() => void copy(secret)}>
                          <Copy aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit ${secret.key}`} onClick={() => setDialog({ kind: 'edit', secret })}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" aria-label={`Delete ${secret.key}`} onClick={() => setDialog({ kind: 'delete', secret })}>
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {dialog?.kind === 'create' ? <SecretFormDialog path={path} onClose={close} onSaved={refresh} /> : null}
      {dialog?.kind === 'edit' ? (
        <SecretFormDialog
          path={path}
          secret={dialog.secret}
          onClose={close}
          onSaved={() => {
            // What is on screen is no longer the stored value.
            revealed.hide(dialog.secret.id);
            return refresh();
          }}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <ConfirmDialog
          title={`Delete ${dialog.secret.key}`}
          description="Applications that read this secret will stop receiving it. It cannot be undone."
          confirmLabel="Delete secret"
          onConfirm={async () => {
            await api<void>(`${path}/${dialog.secret.id}`, { method: 'DELETE' });
            revealed.hide(dialog.secret.id);
            await refresh();
          }}
          onClose={close}
        />
      ) : null}
    </section>
  );
}
