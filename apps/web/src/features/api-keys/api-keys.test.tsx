import { screen, waitFor, within } from '@testing-library/react';
import type { ApiKeyResponse } from '@minivault/contracts';
import { expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { CANARY, backend } from '@/test/server';

const PAGE = '/projects/p1/api-keys';
const PLAINTEXT = `mv_${CANARY}`;
const key = (overrides: Partial<ApiKeyResponse> = {}): ApiKeyResponse => ({
  id: 'k1', name: 'Deploy', prefix: 'mv_abcdefgh', status: 'active', grants: [{ environmentId: 'e3', permissions: ['SECRETS_READ'] }],
  expiresAt: null, lastUsedAt: null, revokedAt: null, createdAt: '2030-01-01T10:00:00.000Z', ...overrides,
});
async function generate(app: ReturnType<typeof renderApp>) {
  await app.user.click(await screen.findByRole('button', { name: 'Generate API key' }));
  const dialog = within(await screen.findByRole('dialog'));
  await app.user.type(dialog.getByLabelText('Name'), 'CI');
  await app.user.click(dialog.getByRole('checkbox', { name: 'PRODUCTION read' }));
  await app.user.click(dialog.getByRole('button', { name: 'Generate API key' }));
  return screen.findByText(PLAINTEXT);
}

it('requires at least one permission', async () => {
  const { user } = renderApp(PAGE);
  await user.click(await screen.findByRole('button', { name: 'Generate API key' }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.type(dialog.getByLabelText('Name'), 'CI');
  await user.click(dialog.getByRole('button', { name: 'Generate API key' }));
  expect(await dialog.findByText('Choose at least one permission.')).toBeInTheDocument();
  expect(backend.requests.some((r) => r.method === 'POST')).toBe(false);
});

it('shows the key once, leaving no trace', async () => {
  const app = renderApp(PAGE);
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  await generate(app);
  expect(screen.getByText('This key is shown only once.')).toBeInTheDocument();
  await app.user.click(screen.getByRole('button', { name: 'Copy key' }));
  expect(write).toHaveBeenCalledWith(PLAINTEXT);
  await app.user.click(screen.getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen.queryByText(PLAINTEXT)).not.toBeInTheDocument());
  expect(screen.getByRole('row', { name: /CI/ })).toBeInTheDocument();
  const caches = JSON.stringify([
    app.queryClient.getQueryCache().getAll().map((q) => q.state), app.queryClient.getMutationCache().getAll().map((m) => m.state),
    { ...localStorage }, { ...sessionStorage },
  ]);
  expect(caches).not.toContain(CANARY);
});

it('asks before closing without copying', async () => {
  const app = renderApp(PAGE);
  await generate(app);
  await app.user.click(screen.getByRole('button', { name: 'Done' }));
  expect(await screen.findByText('You have not copied the key. It cannot be shown again.')).toBeInTheDocument();
  expect(screen.getByText(PLAINTEXT)).toBeInTheDocument();
  await app.user.click(screen.getByRole('button', { name: 'Close without copying' }));
  await waitFor(() => expect(screen.queryByText(PLAINTEXT)).not.toBeInTheDocument());
});

it('asks before Escape discards the key', async () => {
  const app = renderApp(PAGE);
  await generate(app);
  await app.user.keyboard('{Escape}');
  expect(screen.getByText(PLAINTEXT)).toBeInTheDocument();
});

it('sends expiry and permissions', async () => {
  const { user } = renderApp(PAGE);
  await user.click(await screen.findByRole('button', { name: 'Generate API key' }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.type(dialog.getByLabelText('Name'), 'CI');
  await user.selectOptions(dialog.getByLabelText('Expires'), '30 days');
  await user.click(dialog.getByRole('checkbox', { name: 'STAGING read' }));
  await user.click(dialog.getByRole('checkbox', { name: 'STAGING write' }));
  await user.click(dialog.getByRole('button', { name: 'Generate API key' }));
  await screen.findByText(PLAINTEXT);
  const body = backend.requests.find((r) => r.method === 'POST')?.body as { expiresAt: string; grants: unknown };
  expect(body.grants).toEqual([{ environmentId: 'e2', permissions: ['SECRETS_READ', 'SECRETS_WRITE'] }]);
  expect(Math.round((Date.parse(body.expiresAt) - Date.now()) / 86_400_000)).toBe(30);
});

it('shows state, permissions and use', async () => {
  backend.apiKeys = [
    key(),
    key({ id: 'k2', name: 'Old', status: 'expired', expiresAt: '2029-01-01T00:00:00.000Z' }),
    key({ id: 'k3', name: 'Gone', status: 'revoked', revokedAt: '2030-01-02T00:00:00.000Z', lastUsedAt: '2030-01-01T11:00:00.000Z' }),
  ];
  renderApp(PAGE);
  const active = within(await screen.findByRole('row', { name: /Deploy/ }));
  expect(active.getByText('Active')).toBeInTheDocument();
  expect(active.getByText('PRODUCTION: read')).toBeInTheDocument();
  expect(active.getByText('Never')).toBeInTheDocument();
  expect(active.getByText('No expiry')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Old/ })).getByText('Expired')).toBeInTheDocument();
  const gone = within(screen.getByRole('row', { name: /Gone/ }));
  expect(gone.getByText('Revoked')).toBeInTheDocument();
  expect(gone.queryByRole('button')).not.toBeInTheDocument();
});

it('revokes after confirmation', async () => {
  backend.apiKeys = [key()];
  const { user } = renderApp(PAGE);
  await user.click(await screen.findByRole('button', { name: 'Revoke Deploy' }));
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke key' }));
  expect(await screen.findByText('Revoked')).toBeInTheDocument();
});

it('rotates after confirmation and shows the new key', async () => {
  backend.apiKeys = [key()];
  const { user } = renderApp(PAGE);
  await user.click(await screen.findByRole('button', { name: 'Rotate Deploy' }));
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rotate key' }));
  expect(await screen.findByText(PLAINTEXT)).toBeInTheDocument();
});

it('has an empty state', async () => {
  renderApp(PAGE);
  expect(await screen.findByText('This project has no API keys yet.')).toBeInTheDocument();
});
