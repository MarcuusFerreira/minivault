import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 border whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'border-ink bg-ink text-ground hover:not-disabled:bg-ground hover:not-disabled:text-ink',
        secondary: 'border-line-strong bg-transparent text-ink hover:not-disabled:border-ink hover:not-disabled:bg-raised',
        ghost: 'border-transparent bg-transparent text-dim hover:not-disabled:border-line-strong hover:not-disabled:text-ink',
      },
      size: { md: 'h-9 px-4', sm: 'h-8 px-3 text-[13px]', icon: 'size-9' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type Props = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: Props) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
