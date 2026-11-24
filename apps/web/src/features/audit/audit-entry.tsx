import type { AuditLogResponse } from '@minivault/contracts';
import { Boxes, Eye, FolderKey, KeyRound, LockKeyhole, type LucideIcon } from 'lucide-react';
import { formatTime } from '@/lib/format';
import { ACTION_LABELS, subjectOf } from './audit-labels';

const ICONS: Record<AuditLogResponse['resourceType'], LucideIcon> = {
  PROJECT: FolderKey,
  ENVIRONMENT: Boxes,
  SECRET: LockKeyhole,
  API_KEY: KeyRound,
};

interface Props {
  entry: AuditLogResponse;
  actor: string;
  project: string | undefined;
}

/** One step of a timeline: the line joins each icon to the next. */
export function AuditEntryRow({ entry, actor, project }: Props) {
  const Icon = entry.action === 'SECRET_ACCESSED' ? Eye : ICONS[entry.resourceType];
  return (
    <li className="relative flex gap-4 pb-5 last:pb-0 not-last:before:absolute not-last:before:top-9 not-last:before:bottom-0 not-last:before:left-[1.0625rem] not-last:before:w-0.5 not-last:before:rounded-full not-last:before:bg-line">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-raised text-dim">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p>
          <span>{ACTION_LABELS[entry.action]}</span>{' '}
          <strong className="font-mono text-sm font-medium wrap-anywhere">{subjectOf(entry)}</strong>
        </p>
        <p className="text-sm text-dim">
          {project ? `${project}, ` : ''}
          {actor}
          {entry.ipAddress ? ` (${entry.ipAddress})` : ''}
        </p>
      </div>
      <time dateTime={entry.createdAt} className="shrink-0 pt-0.5 text-sm text-dim">
        {formatTime(entry.createdAt)}
      </time>
    </li>
  );
}
