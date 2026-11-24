/** The one way to show plaintext. Nothing else on screen has color. */
export function Plaintext({ value, label }: { value: string; label: string }) {
  return (
    <pre
      aria-label={label}
      className="max-h-64 overflow-auto rounded-xl border border-signal/40 bg-signal/10 px-3 py-1.5 font-mono text-sm break-all whitespace-pre-wrap text-signal"
    >
      {value === '' ? <span className="text-dim">(empty value)</span> : value}
    </pre>
  );
}
