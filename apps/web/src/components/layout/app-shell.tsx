import { FolderKey, LayoutDashboard, LogOut, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/session';
import { ExposureIndicator } from '@/features/secrets/exposure-indicator';
import { RevealedSecretsProvider } from '@/features/secrets/revealed-secrets-context';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/services/api-client';
import { Mark } from './mark';

const NAVIGATION = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKey },
  { to: '/audit', label: 'Audit log', icon: ScrollText },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-full px-4 py-2 font-medium whitespace-nowrap',
    isActive ? 'bg-raised text-ink' : 'text-dim hover:text-ink',
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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-full focus:bg-ink focus:px-5 focus:py-2 focus:text-ground"
      >
        Skip to content
      </a>
      <div className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[14.5rem_1fr] md:grid-rows-1">
        <aside className="grid grid-cols-[1fr_auto] gap-y-2 p-3 md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-6 md:p-4">
          <p className="flex items-center gap-2.5 px-3 py-2 text-lg font-semibold tracking-tight">
            <Mark />
            MiniVault
          </p>
          <nav aria-label="Main" className="order-last col-span-2 flex gap-1 overflow-x-auto md:order-none md:flex-col">
            {NAVIGATION.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
                <Icon aria-hidden className="size-4 shrink-0 max-md:hidden" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-2 pl-4 md:mt-auto">
            <span className="min-w-0 truncate text-sm text-dim max-md:hidden" title={user?.email}>
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={() => void signOut()}>
              <LogOut aria-hidden />
            </Button>
          </div>
        </aside>
        <div className="min-w-0 md:py-3 md:pr-3">
          <main
            id="main"
            tabIndex={-1}
            className="min-h-full bg-sheet px-5 py-8 pb-24 outline-none max-md:rounded-t-3xl md:rounded-3xl md:px-12 md:py-11"
          >
            <div className="mx-auto grid max-w-5xl gap-9">
              {failure ? (
                <p role="alert" className="rounded-2xl bg-ink px-4 py-3 text-ground">
                  {failure}
                </p>
              ) : null}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <ExposureIndicator />
    </RevealedSecretsProvider>
  );
}
