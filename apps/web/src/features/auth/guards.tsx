import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { ErrorState, LoadingRows } from '@/components/ui/states';
import { safeNextPath } from './next-path';
import { useSession } from './session';

function Waiting() {
  const { status, error, retry } = useSession();
  return (
    <main className="mx-auto max-w-xl p-6">
      {status === 'error' ? <ErrorState error={error} onRetry={retry} /> : <LoadingRows label="Loading" />}
    </main>
  );
}

export function RequireSession() {
  const { status } = useSession();
  const { pathname, search } = useLocation();
  if (status === 'loading' || status === 'error') return <Waiting />;
  if (status === 'signed-in') return <Outlet />;
  const next = pathname + search;
  return <Navigate to={next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`} replace />;
}

export function RequireNoSession() {
  const { status } = useSession();
  const [params] = useSearchParams();
  if (status === 'loading' || status === 'error') return <Waiting />;
  return status === 'signed-in' ? <Navigate to={safeNextPath(params.get('next'))} replace /> : <Outlet />;
}
