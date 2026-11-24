import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const controlClass =
  'w-full rounded-xl border border-line-strong/60 bg-ground px-3.5 py-2 text-ink transition-[border-color] duration-150 ease-out placeholder:text-dim hover:not-disabled:border-line-strong aria-invalid:border-2 aria-invalid:border-ink disabled:opacity-50 max-md:text-base';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClass, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClass, 'min-h-28 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        controlClass,
        'h-10 appearance-none bg-[url(/chevron.svg)] bg-[position:right_0.75rem_center] bg-no-repeat pr-10',
        className,
      )}
      {...props}
    />
  );
}
