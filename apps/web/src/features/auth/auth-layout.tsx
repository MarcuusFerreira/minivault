import type { ReactNode } from 'react';
import { Mark } from '@/components/layout/mark';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="grid w-full max-w-sm gap-6">
        <p className="flex items-center justify-center gap-2.5 text-lg font-semibold tracking-tight">
          <Mark />
          MiniVault
        </p>
        <div className="grid gap-6 rounded-3xl bg-sheet p-7 sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
