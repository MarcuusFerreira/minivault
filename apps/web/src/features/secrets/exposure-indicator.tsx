import { EyeOff } from 'lucide-react';
import { plural } from '@/lib/format';
import { useRevealedSecrets } from './revealed-secrets-context';

/** Present only while plaintext is on screen. */
export function ExposureIndicator() {
  const { count, hideAll } = useRevealedSecrets();
  return (
    <div role="status" className="min-h-8">
      {count > 0 ? (
        <div className="flex items-center border border-signal text-signal">
          <span className="px-3 py-1">{plural(count, 'value')} revealed</span>
          <button
            type="button"
            onClick={hideAll}
            className="flex items-center gap-2 border-l border-signal px-3 py-1 hover:bg-signal hover:text-ground"
          >
            <EyeOff aria-hidden className="size-4" />
            Hide all
          </button>
        </div>
      ) : null}
    </div>
  );
}
