import { type ReactNode, createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';

export const REVEAL_TTL_MS = 30_000;

interface RevealedSecrets {
  values: ReadonlyMap<string, string>;
  count: number;
  /** When the first value on screen will be hidden, or null when there is none. */
  nextExpiry: number | null;
  /** Call before fetching. The returned function does nothing if everything was hidden meanwhile. */
  beginReveal: () => (id: string, value: string) => void;
  hide: (id: string) => void;
  hideAll: () => void;
}

const Context = createContext<RevealedSecrets | null>(null);
interface Revealed {
  value: string;
  expiresAt: number;
}
const NONE: ReadonlyMap<string, Revealed> = new Map();

/**
 * The only place plaintext is kept, in component state. It is emptied when the page
 * changes, when the tab is hidden, after 30 seconds, and with the session.
 */
export function RevealedSecretsProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [entries, setEntries] = useState(NONE);
  const generation = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const hide = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setEntries((current) => {
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
    setEntries(NONE);
  }, []);

  const beginReveal = useCallback(() => {
    const startedIn = generation.current;
    return (id: string, value: string) => {
      if (startedIn !== generation.current) return;
      const expiresAt = Date.now() + REVEAL_TTL_MS;
      clearTimeout(timers.current.get(id));
      timers.current.set(id, setTimeout(() => hide(id), REVEAL_TTL_MS));
      setEntries((current) => new Map(current).set(id, { value, expiresAt }));
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
    () => ({
      values: new Map([...entries].map(([id, { value }]) => [id, value])),
      count: entries.size,
      nextExpiry: entries.size === 0 ? null : Math.min(...[...entries.values()].map(({ expiresAt }) => expiresAt)),
      beginReveal,
      hide,
      hideAll,
    }),
    [entries, beginReveal, hide, hideAll],
  );
  return <Context value={context}>{children}</Context>;
}

export function useRevealedSecrets(): RevealedSecrets {
  const context = use(Context);
  if (!context) throw new Error('useRevealedSecrets needs a RevealedSecretsProvider');
  return context;
}
