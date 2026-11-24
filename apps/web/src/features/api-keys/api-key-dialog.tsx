import type { ApiKeyResponse, CreatedApiKeyResponse, EnvironmentResponse } from '@minivault/contracts';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormError } from '@/components/ui/field';
import { api, errorMessage } from '@/services/api-client';
import { GenerateApiKeyForm } from './generate-api-key-form';
import { IssuedKey } from './issued-key';

interface Props {
  projectId: string;
  environments: readonly EnvironmentResponse[];
  /** Rotates this key; generates a new one when absent. */
  rotating?: ApiKeyResponse;
  onIssued: () => void;
  onClose: () => void;
}

/** Holds the plaintext for as long as the dialog is open, and nowhere else. */
export function ApiKeyDialog({ projectId, environments, rotating, onIssued, onClose }: Props) {
  const [plaintext, setPlaintext] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [warning, setWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  function issued(key: CreatedApiKeyResponse) {
    setPlaintext(key.plaintext);
    onIssued();
  }
  function requestClose() {
    if (plaintext === undefined || copied) onClose();
    else setWarning(true);
  }
  async function rotate(key: ApiKeyResponse) {
    setBusy(true);
    setFailure(undefined);
    try {
      issued(await api<CreatedApiKeyResponse>(`/projects/${projectId}/api-keys/${key.id}/rotate`, { method: 'POST' }));
    } catch (error) {
      setFailure(errorMessage(error));
    }
    setBusy(false);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setWarning(false);
      setFailure(undefined);
    } catch {
      setFailure('The key could not be copied. Select it and copy it yourself.');
    }
  }

  const title = plaintext !== undefined ? 'Copy your API key' : rotating ? `Rotate ${rotating.name}` : 'Generate API key';
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : requestClose())} title={title}>
      {plaintext !== undefined ? (
        <IssuedKey
          plaintext={plaintext}
          copied={copied}
          warning={warning}
          failure={failure}
          onCopy={() => void copy(plaintext)}
          onDone={requestClose}
          onDiscard={onClose}
        />
      ) : rotating ? (
        <div className="grid gap-5">
          <p>The current key stops working immediately. The new key keeps its name, permissions and expiry.</p>
          <FormError>{failure}</FormError>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void rotate(rotating)}>
              Rotate key
            </Button>
          </div>
        </div>
      ) : (
        <GenerateApiKeyForm projectId={projectId} environments={environments} onCancel={onClose} onGenerated={issued} />
      )}
    </Dialog>
  );
}
