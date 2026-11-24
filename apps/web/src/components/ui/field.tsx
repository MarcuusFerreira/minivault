import { CircleAlert } from 'lucide-react';
import { type ReactElement, cloneElement, useId } from 'react';

interface Props {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

export function Field({ label, hint, error, children }: Props) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, { id, 'aria-invalid': Boolean(error), ...(note ? { 'aria-describedby': noteId } : {}) })}
      {error ? (
        <p id={noteId} className="flex items-start gap-2 text-sm">
          <CircleAlert aria-hidden className="mt-1 size-4 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="text-sm text-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Errors are inverted rather than colored: the only color on screen means plaintext. */
export function FormError({ children }: { children: string | undefined }) {
  return children ? (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-ink px-4 py-2.5 text-ground">
      <CircleAlert aria-hidden className="mt-1 size-4 shrink-0" />
      {children}
    </p>
  ) : null;
}
