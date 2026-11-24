import { EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { plural } from '@/lib/format';
import { REVEAL_TTL_MS, useRevealedSecrets } from './revealed-secrets-context';

const secondsUntil = (time: number) => Math.max(0, Math.ceil((time - Date.now()) / 1000));

/** Starts where the value really is, so it is right even when it replaces another countdown. */
function CountdownBar({ expiresAt }: { expiresAt: number }) {
  const [left] = useState(() => Math.max(0, expiresAt - Date.now()));
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 origin-left" style={{ scale: `${left / REVEAL_TTL_MS} 1` }}>
      <span
        data-testid="exposure-countdown"
        className="block h-full origin-left animate-deplete bg-signal"
        style={{ animationDuration: `${left}ms` }}
      />
    </span>
  );
}

function CountdownText({ expiresAt }: { expiresAt: number }) {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAt));
  useEffect(() => {
    const timer = setInterval(() => setSeconds(secondsUntil(expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return (
    <span aria-hidden className="pl-3 tabular-nums">
      {`${seconds}s`}
    </span>
  );
}

/** Present only while plaintext is on screen. Leaves at once: hiding must never wait. */
export function ExposureIndicator() {
  const { count, nextExpiry, hideAll } = useRevealedSecrets();
  const reducedMotion = useReducedMotion();
  return (
    <>
      <p role="status" className="sr-only">
        {count > 0 ? `${plural(count, 'value')} on screen` : ''}
      </p>
      {nextExpiry === null ? null : (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
          <div className="pointer-events-auto relative flex items-center gap-1 overflow-hidden rounded-full bg-raised py-1.5 pr-1.5 pl-5 text-sm font-medium text-signal shadow-float transition-[opacity,translate] duration-[180ms] ease-out starting:opacity-0 motion-safe:starting:translate-y-full">
            <span>{plural(count, 'value')} revealed</span>
            {reducedMotion ? <CountdownText key={nextExpiry} expiresAt={nextExpiry} /> : null}
            <button
              type="button"
              onClick={hideAll}
              className="ml-3 flex items-center gap-2 rounded-full bg-signal/15 px-4 py-1.5 hover:bg-signal hover:text-ground"
            >
              <EyeOff aria-hidden className="size-4" />
              Hide all
            </button>
            {reducedMotion ? null : <CountdownBar key={nextExpiry} expiresAt={nextExpiry} />}
          </div>
        </div>
      )}
    </>
  );
}
