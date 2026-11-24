import { FolderKey, LayoutDashboard, LogOut, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/session';
import { ExposureIndicator } from '@/features/secrets/exposure-indicator';
import { RevealedSecretsProvider } from '@/features/secrets/revealed-secrets-context';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/services/api-client';

const NAVIGATION = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKey },
  { to: '/audit', label: 'Audit log', icon: ScrollText },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 border px-3 py-2',
    isActive ? 'border-line-strong bg-raised text-ink' : 'border-transparent text-dim hover:text-ink',
  );

export function AppShell() {
  const { user, logout } = useSession();
  const [failure, setFailure] = useState<string>();

  async function signOut() {
    try {
      await logout();
    } catch (error) {
      setFailure(`You are still signed in. ${errorMessage(error)}`);
    }
  }

  return (
    <RevealedSecretsProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ink focus:p-3 focus:text-ground">
        Skip to content
      </a>
      <div className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[15rem_1fr] md:grid-rows-1">
        <aside className="flex flex-col border-b border-line md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
          <p className="border-b border-line px-5 py-4 font-semibold">MiniVault</p>
          <nav aria-label="Main" className="flex flex-wrap gap-1 p-2 md:flex-col">
            {NAVIGATION.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
                <Icon aria-hidden className="size-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-3 py-2">
            <span className="min-w-0 truncate px-2 text-dim" title={user?.email}>
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>
              <LogOut aria-hidden />
            </Button>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="max-md:not-has-[button]:sr-only sticky top-0 z-30 flex min-h-13 items-center justify-end border-b border-line bg-ground px-4 py-2 md:px-8">
            <ExposureIndicator />
          </header>
          <main id="main" tabIndex={-1} className="mx-auto grid max-w-6xl gap-8 p-4 outline-none md:p-8">
            {failure ? (
              <p role="alert" className="bg-ink px-3 py-2 text-ground">
                {failure}
              </p>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>
    </RevealedSecretsProvider>
  );
}
