import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateSecretRequest,
  type SecretMetadataResponse,
  createSecretRequest,
  updateSecretRequest,
} from '@minivault/contracts';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, FormError } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { ApiError, api, errorMessage } from '@/services/api-client';

interface Props {
  path: string;
  /** Creates a secret when absent. */
  secret?: SecretMetadataResponse;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

/**
 * Calls the API directly: a TanStack mutation would keep the value in its cache as the
 * mutation's variables. The form state is the only copy and goes with the dialog.
 */
export function SecretFormDialog({ path, secret, onClose, onSaved }: Props) {
  const { register, handleSubmit, setError, formState } = useForm<CreateSecretRequest>({
    resolver: zodResolver(createSecretRequest),
    defaultValues: { key: secret?.key ?? '', value: '' },
  });
  const { errors, isSubmitting } = formState;

  const submit = handleSubmit(async (body) => {
    try {
      if (secret) await api(`${path}/${secret.id}`, { method: 'PATCH', body: updateSecretRequest.parse({ value: body.value }) });
      else await api(path, { method: 'POST', body });
      await onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SECRET_KEY_TAKEN') {
        setError('key', { type: 'server', message: 'This environment already has a secret with this key.' });
      } else if (error instanceof ApiError && error.code === 'SECRET_VALUE_INVALID') {
        setError('value', { type: 'server', message: error.message });
      } else {
        setError('root', { message: errorMessage(error) });
      }
    }
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={secret ? `Edit ${secret.key}` : 'Create secret'}
      {...(secret ? { description: 'The current value is not loaded. Saving replaces it.' } : {})}
    >
      <form className="grid gap-5" noValidate autoComplete="off" onSubmit={(event) => void submit(event)}>
        {secret ? null : (
          <Field label="Key" hint="For example DATABASE_URL. It cannot be changed later." error={errors.key?.message}>
            <Input spellCheck={false} autoCapitalize="characters" {...register('key')} />
          </Field>
        )}
        <Field
          label={secret ? 'New value' : 'Value'}
          hint="Saved exactly as entered, including spaces and line breaks."
          error={errors.value && (errors.value.type === 'server' ? errors.value.message : 'Use at most 32768 bytes.')}
        >
          <Textarea spellCheck={false} autoCorrect="off" {...register('value')} />
        </Field>
        <FormError>{errors.root?.message}</FormError>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {secret ? 'Save' : 'Create secret'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
