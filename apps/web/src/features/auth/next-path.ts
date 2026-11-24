/** Only paths of this application: a login link must not be able to send people elsewhere. */
export function safeNextPath(next: string | null): string {
  if (!next?.startsWith('/') || /^\/[/\\]/.test(next)) return '/';
  const url = new URL(next, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search : '/';
}
