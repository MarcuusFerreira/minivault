import { useSyncExternalStore } from 'react';

const query = () => window.matchMedia?.('(prefers-reduced-motion: reduce)');

function subscribe(onChange: () => void): () => void {
  const list = query();
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false);
}
