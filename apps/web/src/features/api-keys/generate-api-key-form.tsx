import type { ApiKeyResponse, CreatedApiKeyResponse, EnvironmentResponse, PermissionValue } from '@minivault/contracts';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { api, errorMessage } from '@/services/api-client';

const DAY_MS = 86_400_000;
const EXPIRY_DAYS = ['30', '90', '365'];
export const PERMISSION_LABELS: Record<PermissionValue, string> = { SECRETS_READ: 'read', SECRETS_WRITE: 'write' };
const PERMISSION_ENTRIES = Object.entries(PERMISSION_LABELS) as [PermissionValue, string][];

interface FormValues {
  name: string;
  days: string;
  /** "<environment id>:<permission>" */
  permissions: string[];
}

interface Props {
  projectId: string;
  environments: readonly EnvironmentResponse[];
  onCancel: () => void;
  onGenerated: (key: CreatedApiKeyResponse) => void;
}

function toGrants(selected: readonly string[]): ApiKeyResponse['grants'] {
  const grants = new Map<string, PermissionValue[]>();
  for (const entry of selected) {
    const [environmentId = '', permission] = entry.split(':');
    grants.set(environmentId, [...(grants.get(environmentId) ?? []), permission as PermissionValue]);
  }
  return [...grants].map(([environmentId, permissions]) => ({ environmentId, permissions }));
}

/** Calls the API directly, so the plaintext key never enters a cache. */
export function GenerateApiKeyForm({ projectId, environments, onCancel, onGenerated }: Props) {
  const { register, handleSubmit, setError, formState } = useForm<FormValues>({
    defaultValues: { name: '', days: '90', permissions: [] },
  });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async ({ name, days, permissions }) => {
    try {
      const expiresAt = days ? new Date(Date.now() + Number(days) * DAY_MS).toISOString() : null;
      const body = { name: name.trim(), expiresAt, grants: toGrants(permissions) };
      onGenerated(await api<CreatedApiKeyResponse>(`/projects/${projectId}/api-keys`, { method: 'POST', body }));
    } catch (error) {
      setError('root', { message: errorMessage(error) });
    }
  });

  return (
    <form className="grid gap-5" noValidate onSubmit={(event) => void submit(event)}>
      <Field label="Name" error={errors.name && 'Use between 1 and 100 characters.'}>
        <Input
          autoComplete="off"
          {...register('name', { validate: (value) => value.trim().length >= 1 && value.trim().length <= 100 })}
        />
      </Field>
      <Field label="Expires">
        <Select {...register('days')}>
          {EXPIRY_DAYS.map((days) => (
            <option key={days} value={days}>
              {days} days
            </option>
          ))}
          <option value="">Never</option>
        </Select>
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Permissions</legend>
        {environments.map(({ id, name }) => (
          <div key={id} className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-raised px-4 py-2.5">
            <span className="min-w-36 font-mono text-sm">{name}</span>
            {PERMISSION_ENTRIES.map(([permission, label]) => (
              <label key={permission} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 appearance-none rounded-[5px] border border-line-strong bg-ground checked:border-ink checked:bg-ink checked:bg-[url(/check.svg)] checked:bg-center checked:bg-no-repeat"
                  aria-label={`${name} ${label}`}
                  value={`${id}:${permission}`}
                  {...register('permissions', { validate: (selected) => selected.length > 0 })}
                />
                {label}
              </label>
            ))}
          </div>
        ))}
        {errors.permissions ? <p>Choose at least one permission.</p> : null}
      </fieldset>
      <FormError>{errors.root?.message}</FormError>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Generate API key
        </Button>
      </div>
    </form>
  );
}
