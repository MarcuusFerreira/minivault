import { screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { secret, server } from '@/test/server';

const PAGE = '/projects/p1/PRODUCTION';

it('shows that a value was copied, then returns to rest', async () => {
  const { user } = renderApp(PAGE);
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  await user.click(await screen.findByRole('button', { name: 'Copy DATABASE_URL' }));
  expect(await screen.findByTitle('Copied')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByTitle('Copied')).not.toBeInTheDocument(), { timeout: 3000 });
});

it('shows that a reveal is under way and ignores a second click', async () => {
  let release = () => {};
  const blocked = new Promise<void>((resolve) => (release = resolve));
  let reads = 0;
  server.use(
    http.get('*/secrets/s1', async () => {
      reads += 1;
      await blocked;
      return HttpResponse.json({ ...secret('s1', 'DATABASE_URL'), value: 'v' });
    }),
  );
  const { user } = renderApp(PAGE);
  const button = await screen.findByRole('button', { name: 'Reveal DATABASE_URL' });
  await user.click(button);
  expect(button).toHaveAttribute('aria-busy', 'true');
  await user.click(button);
  release();
  expect(await screen.findByRole('button', { name: 'Hide DATABASE_URL' })).toHaveAttribute('aria-busy', 'false');
  expect(reads).toBe(1);
});

it('puts the cursor in the first field of a dialog', async () => {
  const { user } = renderApp(PAGE);
  await user.click(await screen.findByRole('button', { name: 'Create secret' }));
  expect(within(await screen.findByRole('dialog')).getByLabelText('Key')).toHaveFocus();
});

it('starts on Cancel when there is only something to destroy', async () => {
  const { user } = renderApp(PAGE);
  await user.click(await screen.findByRole('button', { name: 'Delete STRIPE_KEY' }));
  expect(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' })).toHaveFocus();
});
