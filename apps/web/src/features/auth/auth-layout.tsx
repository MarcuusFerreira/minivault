import type { ReactNode } from 'react';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm border border-line-strong bg-raised">
        <p className="border-b border-line-strong px-6 py-3 font-semibold">MiniVault</p>
        <div className="grid gap-5 p-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
