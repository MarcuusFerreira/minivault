/** PostgreSQL text holds neither NUL nor unpaired surrogates. */
export function isStorableText(value: string): boolean {
  return value.isWellFormed() && !value.includes('\u0000');
}
