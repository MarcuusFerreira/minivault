import { X } from 'lucide-react';
import { Dialog as Primitive } from 'radix-ui';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children }: Props) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-40 bg-ground/80" />
        <Primitive.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain border border-line-strong bg-raised p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <Primitive.Title className="text-lg font-semibold">{title}</Primitive.Title>
              {description ? <Primitive.Description className="text-dim">{description}</Primitive.Description> : null}
            </div>
            <Primitive.Close aria-label="Close" className="border border-transparent p-1 text-dim hover:border-line-strong hover:text-ink">
              <X aria-hidden className="size-4" />
            </Primitive.Close>
          </div>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
