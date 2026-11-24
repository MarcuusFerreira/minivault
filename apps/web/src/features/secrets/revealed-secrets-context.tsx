import { type ReactNode, createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';

export const REVEAL_TTL_MS = 30_000;

interface RevealedSecrets {
  values: ReadonlyMap<string, string>;
  count: number;
  /** Call before fetching. The returned function does nothing if everything was hidden meanwhile. */
  beginReveal: () => (id: string, value: string) => void;
  hide: (id: string) => void;
  hideAll: () => void;
}

const Context = createContext<RevealedSecrets | null>(null);
const NONE: ReadonlyMap<string, string> = new Map();

/**
 * The only place plaintext is kept, in component state. It is emptied when the page
 * changes, when the tab is hidden, after 30 seconds, and with the session.
 */
export function RevealedSecretsProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [values, setValues] = useState(NONE);
  const generation = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const hide = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setValues((current) => {
      if (!current.has(id)) return current;
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  const hideAll = useCallback(() => {
    generation.current += 1;
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setValues(NONE);
  }, []);

  const beginReveal = useCallback(() => {
    const startedIn = generation.current;
    return (id: string, value: string) => {
      if (startedIn !== generation.current) return;
      clearTimeout(timers.current.get(id));
      timers.current.set(id, setTimeout(() => hide(id), REVEAL_TTL_MS));
      setValues((current) => new Map(current).set(id, value));
    };
  }, [hide]);

  useEffect(() => hideAll, [pathname, hideAll]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') hideAll();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [hideAll]);

  const context = useMemo(
    () => ({ values, count: values.size, beginReveal, hide, hideAll }),
    [values, beginReveal, hide, hideAll],
  );
  return <Context value={context}>{children}</Context>;
}

export function useRevealedSecrets(): RevealedSecrets {
  const context = use(Context);
  if (!context) throw new Error('useRevealedSecrets needs a RevealedSecretsProvider');
  return context;
}
