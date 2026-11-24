import { X } from 'lucide-react';
import { Dialog as Primitive } from 'radix-ui';
import type { ReactNode } from 'react';

/** Enters softly and leaves at once: a closing dialog can hold plaintext. */
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
        <Primitive.Overlay className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ease-out starting:opacity-0" />
        <Primitive.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-3xl bg-sheet p-7 shadow-float transition-[opacity,scale] duration-200 ease-out starting:opacity-0 motion-safe:starting:scale-[0.97]"
        >
          <div className="mb-5 grid gap-1 pr-10">
            <Primitive.Title className="text-xl font-semibold tracking-tight">{title}</Primitive.Title>
              {description ? <Primitive.Description className="text-dim">{description}</Primitive.Description> : null}
          </div>
          {children}
          {/* Last, so that focus starts on the content. */}
          <Primitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-dim hover:bg-hover hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
