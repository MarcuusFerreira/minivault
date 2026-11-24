import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { Plaintext } from '@/features/secrets/plaintext';

interface Props {
  plaintext: string;
  copied: boolean;
  /** Set after an attempt to close without copying. */
  warning: boolean;
  failure: string | undefined;
  onCopy: () => void;
  onDone: () => void;
  onDiscard: () => void;
}

export function IssuedKey({ plaintext, copied, warning, failure, onCopy, onDone, onDiscard }: Props) {
  return (
    <div className="grid gap-5">
      <p>This key is shown only once.</p>
      <Plaintext value={plaintext} label="API key" />
      <FormError>{failure ?? (warning ? 'You have not copied the key. It cannot be shown again.' : undefined)}</FormError>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCopy}>
          <Copy aria-hidden />
          {copied ? 'Copied' : 'Copy key'}
        </Button>
        {warning ? <Button onClick={onDiscard}>Close without copying</Button> : <Button onClick={onDone}>Done</Button>}
      </div>
    </div>
  );
}
