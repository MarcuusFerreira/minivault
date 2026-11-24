import type { AuditLogResponse } from '@minivault/contracts';
import { screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { backend, server } from '@/test/server';

const entry = (id: string, overrides: Partial<AuditLogResponse> = {}): AuditLogResponse => ({
  id, action: 'SECRET_ACCESSED', actor: { type: 'user', id: 'u1' }, projectId: 'p1', environmentId: 'e3', resourceType: 'SECRET',
  resourceId: 's1', ipAddress: '10.0.0.1', metadata: { key: 'DATABASE_URL' }, createdAt: '2030-01-02T10:00:00.000Z', ...overrides,
});
const auditRequests = () => backend.requests.filter((r) => r.path.startsWith('/api/v1/audit-logs')).map((r) => r.path);

it('groups entries by day with actor, time and project', async () => {
  backend.apiKeys = [{ id: 'k1', name: 'Deploy', prefix: 'mv_abcdefgh', status: 'active', grants: [], expiresAt: null, lastUsedAt: null, revokedAt: null, createdAt: '' }];
  backend.audit = {
    items: [entry('a1'), entry('a2', { actor: { type: 'apiKey', id: 'k1' } }), entry('a3', { action: 'PROJECT_CREATED', metadata: { name: 'Payments' }, createdAt: '2030-01-01T10:00:00.000Z' })],
    nextCursor: null,
  };
  renderApp('/audit');
  expect(await screen.findAllByRole('heading', { level: 2 })).toHaveLength(2);
  expect(screen.getAllByText('Secret accessed', { selector: 'p *, p' }).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/You/).length).toBeGreaterThan(0);
  expect(await screen.findByText(/API key Deploy/)).toBeInTheDocument();
  expect(screen.getAllByText(/10\.0\.0\.1/).length).toBe(3);
});

it('names an API key it cannot look up by its id', async () => {
  backend.audit = { items: [entry('a1', { actor: { type: 'apiKey', id: 'abcdef12-0000' } })], nextCursor: null };
  renderApp('/audit');
  expect(await screen.findByText(/API key abcdef12/)).toBeInTheDocument();
});

it('keeps filters in the address', async () => {
  const { user, router } = renderApp('/audit');
  await user.selectOptions(await screen.findByLabelText('Action'), 'Secret created');
  await waitFor(() => expect(router.state.location.search).toBe('?action=SECRET_CREATED'));
  await user.selectOptions(screen.getByLabelText('Project'), 'Payments');
  await waitFor(() => expect(auditRequests().at(-1)).toBe('/api/v1/audit-logs?limit=25&projectId=p1&action=SECRET_CREATED'));
  expect(await screen.findByText('No activity matches these filters.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Clear filters' }));
  await waitFor(() => expect(router.state.location.search).toBe(''));
});

it('loads more by cursor', async () => {
  server.use(http.get('*/api/v1/audit-logs', ({ request }) => {
    const second = new URL(request.url).searchParams.get('cursor') === 'next';
    return HttpResponse.json(second
      ? { items: [entry('b1', { metadata: { key: 'SECOND' } })], nextCursor: null }
      : { items: [entry('b0', { metadata: { key: 'FIRST' } })], nextCursor: 'next' });
  }));
  const { user } = renderApp('/audit');
  await user.click(await screen.findByRole('button', { name: 'Load more' }));
  expect(await screen.findByText('SECOND')).toBeInTheDocument();
  expect(screen.getByText('FIRST')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});

it('has an empty state', async () => {
  renderApp('/audit');
  expect(await screen.findByText('No activity yet.')).toBeInTheDocument();
});
