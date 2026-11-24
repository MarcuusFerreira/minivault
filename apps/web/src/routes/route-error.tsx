import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/states';

export function RouteError() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <EmptyState title="This page could not be shown.">
        <Link className="underline underline-offset-4" to="/" reloadDocument>
          Back to the dashboard
        </Link>
      </EmptyState>
    </main>
  );
}

export function NotFound() {
  return (
    <EmptyState title="Page not found.">
      <Link className="underline underline-offset-4" to="/">
        Back to the dashboard
      </Link>
    </EmptyState>
  );
}
