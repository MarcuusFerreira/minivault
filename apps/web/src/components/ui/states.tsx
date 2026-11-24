import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApiError, errorMessage } from '@/services/api-client';
import { Button } from './button';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3 border border-dashed border-line-strong p-6">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const reference = error instanceof ApiError ? error.correlationId : undefined;
  return (
    <div role="alert" className="grid justify-items-start gap-3 border border-ink p-6">
      <p className="flex items-center gap-2 font-medium">
        <CircleAlert aria-hidden className="size-4 shrink-0" />
        {errorMessage(error)}
      </p>
      {reference ? <p className="break-all text-dim">Reference: {reference}</p> : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

const ROWS = [0, 1, 2];

export function LoadingRows({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="border border-line">
      {ROWS.map((row) => (
        <div key={row} className="border-b border-line p-4 last:border-b-0">
          <div className="h-4 w-1/3 animate-pulse bg-line" />
        </div>
      ))}
    </div>
  );
}
