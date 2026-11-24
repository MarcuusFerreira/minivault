import { useState } from 'react';
import { errorMessage } from '@/services/api-client';
import { Button } from './button';
import { Dialog } from './dialog';
import { Field, FormError } from './field';
import { Input } from './input';

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  /** Text that must be typed before confirming. */
  requireText?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel, requireText, onConfirm, onClose }: Props) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const blocked = busy || (requireText !== undefined && typed !== requireText);

  async function confirm() {
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())} title={title} description={description}>
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!blocked) void confirm();
        }}
      >
        {requireText === undefined ? null : (
          <Field label={`Type ${requireText} to confirm`}>
            <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
        )}
        <FormError>{error}</FormError>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={blocked}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
