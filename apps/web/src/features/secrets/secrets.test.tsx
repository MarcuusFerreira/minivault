import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { heading, renderApp } from '@/test/render';
import { CANARY, backend, failure, secret, server } from '@/test/server';
import { REVEAL_TTL_MS } from './revealed-secrets-context';

const PAGE = '/projects/p1/PRODUCTION';
const row = async (key: string) => within(await screen.findByRole('row', { name: new RegExp(key) }));
const revealFirst = async (user: ReturnType<typeof renderApp>['user']) => {
  await user.click((await row('DATABASE_URL')).getByRole('button', { name: 'Reveal DATABASE_URL' }));
  return screen.findByText(`${CANARY}-s1`);
};
const readsOfValue = () => backend.requests.filter((r) => r.method === 'GET' && r.path.endsWith('/secrets/s1'));

function expectNoTrace(app: ReturnType<typeof renderApp>) {
  const cached = JSON.stringify([
    app.queryClient.getQueryCache().getAll().map((q) => q.state),
    app.queryClient.getMutationCache().getAll().map((m) => m.state),
    { ...localStorage }, { ...sessionStorage }, window.location.href, app.router.state.location,
  ]);
  expect(cached).not.toContain(CANARY);
}

it('masks values without revealing their length', async () => {
  renderApp(PAGE);
  const masks = [(await row('DATABASE_URL')).getByText('••••••••'), (await row('STRIPE_KEY')).getByText('••••••••')];
  expect(masks).toHaveLength(2);
  expect(readsOfValue()).toEqual([]);
  expect(screen.queryByText(/revealed/)).not.toBeInTheDocument();
});

it('reveals on request, says so, and hides', async () => {
  const app = renderApp(PAGE);
  await revealFirst(app.user);
  expect(screen.getByText('1 value revealed')).toBeInTheDocument();
  expect(readsOfValue()).toHaveLength(1);
  await app.user.click(screen.getByRole('button', { name: 'Hide DATABASE_URL' }));
  expect(screen.queryByText(`${CANARY}-s1`)).not.toBeInTheDocument();
  expect(screen.queryByText(/revealed/)).not.toBeInTheDocument();
});

it('hides everything at once', async () => {
  const { user } = renderApp(PAGE);
  await revealFirst(user);
  await user.click((await row('STRIPE_KEY')).getByRole('button', { name: 'Reveal STRIPE_KEY' }));
  expect(await screen.findByText('2 values revealed')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Hide all' }));
  expect(screen.queryByText(new RegExp(CANARY))).not.toBeInTheDocument();
});

describe('revealed values disappear', () => {
  const gone = () => waitFor(() => expect(screen.queryByText(new RegExp(CANARY))).not.toBeInTheDocument());

  it('after 30 seconds', async () => {
    expect(REVEAL_TTL_MS).toBe(30_000);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderApp(PAGE);
    fireEvent.click((await row('DATABASE_URL')).getByRole('button', { name: 'Reveal DATABASE_URL' }));
    await screen.findByText(`${CANARY}-s1`);
    act(() => void vi.advanceTimersByTime(REVEAL_TTL_MS - 2000));
    expect(screen.getByText(`${CANARY}-s1`)).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(2500));
    await gone();
  });

  it('when the environment changes', async () => {
    const { user } = renderApp(PAGE);
    await revealFirst(user);
    await user.click(screen.getByRole('link', { name: 'STAGING' }));
    await gone();
  });

  it('when leaving the project and coming back', async () => {
    const { user, router } = renderApp(PAGE);
    await revealFirst(user);
    await user.click(screen.getByRole('link', { name: 'Projects' }));
    await heading('Projects');
    await act(() => router.navigate(PAGE));
    await row('DATABASE_URL');
    await gone();
  });

  it('when the tab is hidden', async () => {
    const { user } = renderApp(PAGE);
    await revealFirst(user);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    await gone();
  });

  it('when signing out', async () => {
    const app = renderApp(PAGE);
    await revealFirst(app.user);
    await app.user.click(screen.getByRole('button', { name: 'Sign out' }));
    await heading('Sign in');
    await gone();
    expectNoTrace(app);
  });

  it('when the session expires in the middle of an edit', async () => {
    const app = renderApp(PAGE);
    await revealFirst(app.user);
    await app.user.click(screen.getByRole('button', { name: 'Edit STRIPE_KEY' }));
    const dialog = within(await screen.findByRole('dialog'));
    await app.user.type(dialog.getByLabelText('New value'), 'changed');
    backend.signedIn = false;
    await app.user.click(dialog.getByRole('button', { name: 'Save' }));
    await heading('Sign in');
    expect(screen.getByText('Your session expired. Sign in again.')).toBeInTheDocument();
    expect(app.router.state.location.search).toBe(`?next=${encodeURIComponent(PAGE)}`);
    await gone();
    expectNoTrace(app);
  });

  it('never appear when the answer arrives after leaving', async () => {
    let release = () => {};
    const blocked = new Promise<void>((resolve) => (release = resolve));
    let answered = false;
    server.use(http.get('*/secrets/s1', async () => {
      await blocked;
      answered = true;
      return HttpResponse.json({ ...secret('s1', 'DATABASE_URL'), value: CANARY });
    }));
    const { user } = renderApp(PAGE);
    await user.click((await row('DATABASE_URL')).getByRole('button', { name: 'Reveal DATABASE_URL' }));
    await user.click(screen.getByRole('link', { name: 'STAGING' }));
    release();
    await waitFor(() => expect(answered).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText(CANARY)).not.toBeInTheDocument();
    expect(screen.queryByText(/revealed/)).not.toBeInTheDocument();
  });
});

it('copies without showing', async () => {
  const app = renderApp(PAGE);
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  await app.user.click((await row('DATABASE_URL')).getByRole('button', { name: 'Copy DATABASE_URL' }));
  await waitFor(() => expect(write).toHaveBeenCalledWith(`${CANARY}-s1`));
  expect(await screen.findByText('Copied DATABASE_URL.')).toBeInTheDocument();
  expect(screen.queryByText(new RegExp(CANARY))).not.toBeInTheDocument();
  expectNoTrace(app);
});

it('says when copying is not possible', async () => {
  const { user } = renderApp(PAGE);
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
  await user.click((await row('DATABASE_URL')).getByRole('button', { name: 'Copy DATABASE_URL' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('DATABASE_URL could not be copied');
});

it('creates a secret exactly as typed, keeping no trace of it', async () => {
  const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  const app = renderApp(PAGE);
  await app.user.click(await screen.findByRole('button', { name: 'Create secret' }));
  const dialog = within(await screen.findByRole('dialog'));
  await app.user.type(dialog.getByLabelText('Key'), 'bad-key');
  await app.user.click(dialog.getByRole('button', { name: 'Create secret' }));
  expect(await dialog.findByText(/Start with A-Z or _/)).toBeInTheDocument();
  await app.user.clear(dialog.getByLabelText('Key'));
  await app.user.type(dialog.getByLabelText('Key'), 'NEW_KEY');
  fireEvent.change(dialog.getByLabelText('Value'), { target: { value: ` ${CANARY}\nsecond line\n` } });
  await app.user.click(dialog.getByRole('button', { name: 'Create secret' }));
  await row('NEW_KEY');
  expect(backend.requests.find((r) => r.method === 'POST')?.body).toEqual({ key: 'NEW_KEY', value: ` ${CANARY}\nsecond line\n` });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expectNoTrace(app);
  expect(JSON.stringify(spies.map((s) => s.mock.calls))).not.toContain(CANARY);
});

it('reports a key already used, on the field', async () => {
  server.use(http.post('*/secrets', () => failure(409, 'SECRET_KEY_TAKEN')));
  const { user } = renderApp(PAGE);
  await user.click(await screen.findByRole('button', { name: 'Create secret' }));
  const dialog = within(await screen.findByRole('dialog'));
  await user.type(dialog.getByLabelText('Key'), 'DATABASE_URL');
  await user.click(dialog.getByRole('button', { name: 'Create secret' }));
  expect(await dialog.findByText('This environment already has a secret with this key.')).toBeInTheDocument();
});

it('edits without ever loading the current value, and drops a stale reveal', async () => {
  const app = renderApp(PAGE);
  await revealFirst(app.user);
  const reads = readsOfValue().length;
  await app.user.click(screen.getByRole('button', { name: 'Edit DATABASE_URL' }));
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByLabelText('New value')).toHaveValue('');
  await app.user.type(dialog.getByLabelText('New value'), 'changed');
  await app.user.click(dialog.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(backend.requests.find((r) => r.method === 'PATCH')?.body).toEqual({ value: 'changed' });
  expect(readsOfValue()).toHaveLength(reads);
  expect(screen.queryByText(`${CANARY}-s1`)).not.toBeInTheDocument();
  expectNoTrace(app);
});

it('deletes after confirmation', async () => {
  const { user } = renderApp(PAGE);
  await user.click((await row('STRIPE_KEY')).getByRole('button', { name: 'Delete STRIPE_KEY' }));
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete secret' }));
  await waitFor(() => expect(screen.queryByRole('row', { name: /STRIPE_KEY/ })).not.toBeInTheDocument());
});

it('searches by key', async () => {
  const { user } = renderApp(PAGE);
  await row('DATABASE_URL');
  await user.type(screen.getByLabelText('Search secrets'), 'stripe');
  await waitFor(() => expect(screen.queryByRole('row', { name: /DATABASE_URL/ })).not.toBeInTheDocument());
  expect(screen.getByRole('row', { name: /STRIPE_KEY/ })).toBeInTheDocument();
  await user.type(screen.getByLabelText('Search secrets'), 'zzz');
  expect(await screen.findByText('No secret matches your search.')).toBeInTheDocument();
});

it('has an empty state', async () => {
  backend.secrets = [];
  renderApp(PAGE);
  expect(await screen.findByText('PRODUCTION has no secrets yet.')).toBeInTheDocument();
});

it('explains that the encryption service is down', async () => {
  server.use(http.get('*/secrets/s1', () => failure(503, 'ENCRYPTION_UNAVAILABLE', 'Encryption service is unavailable. Try again.')));
  const { user } = renderApp(PAGE);
  await user.click((await row('DATABASE_URL')).getByRole('button', { name: 'Reveal DATABASE_URL' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Encryption service is unavailable. Try again.');
});

it('shows an environment that does not exist as such', async () => {
  renderApp('/projects/p1/QA');
  expect(await screen.findByText('This project has no QA environment.')).toBeInTheDocument();
});
