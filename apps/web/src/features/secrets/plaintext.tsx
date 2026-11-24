/** The one way to show plaintext. Nothing else on screen has color. */
export function Plaintext({ value, label }: { value: string; label: string }) {
  return (
    <pre
      aria-label={label}
      className="max-h-64 overflow-auto border-l-2 border-signal bg-ground px-3 py-2 font-sans break-all whitespace-pre-wrap text-signal"
    >
      {value === '' ? <span className="text-dim">(empty value)</span> : value}
    </pre>
  );
}
