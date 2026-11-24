import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { expect, it } from 'vitest';
import { heading, renderApp } from '@/test/render';
import { backend, failure, project, server, user as account } from '@/test/server';

const tile = async (name: string) => within(await screen.findByRole('group', { name }));
const entry = (id: string, overrides: object = {}) => ({
  id, action: 'SECRET_CREATED' as const, actor: { type: 'user' as const, id: account.id }, projectId: 'p1', environmentId: 'e1',
  resourceType: 'SECRET' as const, resourceId: 's1', ipAddress: '10.0.0.1', metadata: { key: 'DATABASE_URL' }, createdAt: '2030-01-01T10:00:00.000Z', ...overrides,
});

it('adds up the projects and shows recent activity', async () => {
  backend.projects = [project, { ...project, id: 'p2', name: 'Other', environmentCount: 2, secretCount: 5 }];
  backend.audit = { items: [entry('a1')], nextCursor: null };
  renderApp('/');
  expect((await tile('Projects')).getByText('2')).toBeInTheDocument();
  expect((await tile('Environments')).getByText('5')).toBeInTheDocument();
  expect((await tile('Secrets')).getByText('7')).toBeInTheDocument();
  expect(await screen.findByText('DATABASE_URL')).toBeInTheDocument();
  expect(backend.requests.map((r) => r.path)).toContain('/api/v1/audit-logs?limit=10');
});

it('requests projects and activity in parallel', async () => {
  let release = () => {};
  const blocked = new Promise<void>((resolve) => (release = resolve));
  server.use(http.get('*/api/v1/projects', async () => {
    await blocked;
    return HttpResponse.json([project]);
  }));
  renderApp('/');
  await waitFor(() => expect(backend.requests.map((r) => r.path)).toContain('/api/v1/audit-logs?limit=10'));
  release();
  await tile('Projects');
});

it('invites to create the first project', async () => {
  backend.projects = [];
  renderApp('/');
  expect(await screen.findByText('You have no projects yet.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument();
});

it('creates a project and opens it', async () => {
  const { user, router } = renderApp('/projects');
  await user.click(await screen.findByRole('button', { name: 'Create project' }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Create project' }));
  expect(await dialog.findByText('Use between 1 and 100 characters.')).toBeInTheDocument();
  await user.type(dialog.getByLabelText('Name'), 'Billing');
  await user.click(dialog.getByRole('button', { name: 'Create project' }));
  await heading('Billing');
  expect(router.state.location.pathname).toBe('/projects/p2');
});

it('reports a name already used, on the field', async () => {
  server.use(http.post('*/api/v1/projects', () => failure(409, 'PROJECT_NAME_TAKEN')));
  const { user } = renderApp('/projects');
  await user.click(await screen.findByRole('button', { name: 'Create project' }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.type(dialog.getByLabelText('Name'), 'Payments');
  await user.click(dialog.getByRole('button', { name: 'Create project' }));
  expect(await dialog.findByText('You already have a project with this name.')).toBeInTheDocument();
  expect(dialog.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
});

it('edits a project', async () => {
  const { user } = renderApp('/projects/p1');
  await user.click(await screen.findByRole('button', { name: 'Edit' }));
  const dialog = within(await screen.findByRole('dialog'));
  const name = dialog.getByLabelText('Name');
  expect(name).toHaveValue('Payments');
  await user.clear(name);
  await user.type(name, 'Renamed');
  await user.click(dialog.getByRole('button', { name: 'Save' }));
  await heading('Renamed');
});

it('deletes a project only after its name is typed', async () => {
  const { user, router } = renderApp('/projects/p1');
  await user.click(await screen.findByRole('button', { name: 'Delete project' }));
  const dialog = within(await screen.findByRole('dialog'));
  const confirm = dialog.getByRole('button', { name: 'Delete project' });
  expect(confirm).toBeDisabled();
  await user.type(dialog.getByLabelText('Type Payments to confirm'), 'Payment');
  expect(confirm).toBeDisabled();
  await user.type(dialog.getByLabelText('Type Payments to confirm'), 's');
  await user.click(confirm);
  await heading('Projects');
  expect(router.state.location.pathname).toBe('/projects');
  expect(backend.projects).toEqual([]);
});

it('keeps the dialog open when deletion fails', async () => {
  server.use(http.delete('*/api/v1/projects/p1', () => failure(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')));
  const { user } = renderApp('/projects/p1');
  await user.click(await screen.findByRole('button', { name: 'Delete project' }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.type(dialog.getByRole('textbox'), 'Payments');
  await user.click(dialog.getByRole('button', { name: 'Delete project' }));
  expect(await dialog.findByRole('alert')).toHaveTextContent('An unexpected error occurred.');
});

it('shows a missing project as such', async () => {
  renderApp('/projects/nope');
  expect(await screen.findByText('Project not found.')).toBeInTheDocument();
});

it('recovers from a failed load', async () => {
  let broken = true;
  server.use(http.get('*/api/v1/projects', () => (broken ? failure(403, 'X', 'Not now.') : HttpResponse.json([project]))));
  const { user } = renderApp('/projects');
  expect(await screen.findByText('Not now.')).toBeInTheDocument();
  expect(screen.getByText('Reference: corr-12345')).toBeInTheDocument();
  broken = false;
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: 'Payments' })).toBeInTheDocument();
});

it('lists environments with a way to delete them', async () => {
  const { user } = renderApp('/projects/p1');
  await user.click(await screen.findByRole('button', { name: 'Delete STAGING' }));
  expect(await screen.findByLabelText('Type STAGING to confirm')).toBeInTheDocument();
});
