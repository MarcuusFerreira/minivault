import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const controlClass =
  'w-full border border-line-strong bg-ground px-3 py-1.5 text-ink placeholder:text-dim aria-invalid:border-2 aria-invalid:border-ink disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClass, 'h-9', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClass, 'min-h-28 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(controlClass, 'h-9', className)} {...props} />;
}
