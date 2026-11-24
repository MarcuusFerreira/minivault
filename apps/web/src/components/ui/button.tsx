import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[color,background-color,scale] duration-150 ease-out motion-safe:not-disabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-ground hover:not-disabled:bg-white',
        secondary: 'bg-raised text-ink hover:not-disabled:bg-hover',
        ghost: 'text-dim hover:not-disabled:bg-hover hover:not-disabled:text-ink',
      },
      size: { md: 'h-10 px-5', sm: 'h-8 px-3.5 text-sm', icon: 'size-9' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type Props = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: Props) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
