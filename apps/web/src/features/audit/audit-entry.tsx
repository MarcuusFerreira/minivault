import type { AuditLogResponse } from '@minivault/contracts';
import { formatTime } from '@/lib/format';
import { ACTION_LABELS, subjectOf } from './audit-labels';

interface Props {
  entry: AuditLogResponse;
  actor: string;
  project: string | undefined;
}

export function AuditEntryRow({ entry, actor, project }: Props) {
  return (
    <li className="grid gap-1 border-b border-line p-4 last:border-b-0 sm:grid-cols-[8rem_1fr_auto] sm:gap-6">
      <time dateTime={entry.createdAt} className="text-dim">
        {formatTime(entry.createdAt)}
      </time>
      <div className="min-w-0">
        <p>
          <span>{ACTION_LABELS[entry.action]}</span> <strong className="font-medium break-all">{subjectOf(entry)}</strong>
        </p>
        {project ? <p className="truncate text-dim">{project}</p> : null}
      </div>
      <p className="text-dim">
        {actor}
        {entry.ipAddress ? ` (${entry.ipAddress})` : ''}
      </p>
    </li>
  );
}
