import type { AuditLogResponse } from '@minivault/contracts';
import { useQueries } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiKeysQuery } from '@/services/queries';

/** Only the owner can see a project's activity, so a user entry is always the reader's own. */
export function useActorNames(entries: readonly AuditLogResponse[]): (entry: AuditLogResponse) => string {
  const projectIds = [...new Set(entries.filter((e) => e.actor.type === 'apiKey').map((e) => e.projectId))];
  const results = useQueries({ queries: projectIds.map((id) => ({ ...apiKeysQuery(id), retry: false })) });
  const names = new Map(results.flatMap((result) => result.data ?? []).map((key) => [key.id, key.name]));
  return useCallback(
    ({ actor }: AuditLogResponse) => (actor.type === 'user' ? 'You' : `API key ${names.get(actor.id) ?? actor.id.slice(0, 8)}`),
    [names],
  );
}
