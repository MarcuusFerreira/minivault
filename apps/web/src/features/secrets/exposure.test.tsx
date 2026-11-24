import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { CANARY } from '@/test/server';

const PAGE = '/projects/p1/PRODUCTION';
afterEach(() => vi.unstubAllGlobals());

async function reveal(key: string, id: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Reveal ${key}` }));
  await screen.findByText(`${CANARY}-${id}`);
}
const remaining = () => Number(screen.getByTestId('exposure-countdown').style.animationDuration.replace('ms', ''));

it('counts down to the value that expires first, then to the next one', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  renderApp(PAGE);
  await reveal('DATABASE_URL', 's1');
  expect(remaining()).toBeGreaterThan(29_000);
  act(() => void vi.advanceTimersByTime(10_000));
  const bar = screen.getByTestId('exposure-countdown');
  await reveal('STRIPE_KEY', 's2');
  expect(screen.getByTestId('exposure-countdown')).toBe(bar); // not restarted: the first still expires first
  fireEvent.click(screen.getByRole('button', { name: 'Hide DATABASE_URL' }));
  expect(screen.getByTestId('exposure-countdown')).not.toBe(bar);
  expect(remaining()).toBeGreaterThan(28_000);
  fireEvent.click(screen.getByRole('button', { name: 'Hide all' }));
  expect(screen.queryByTestId('exposure-countdown')).not.toBeInTheDocument();
});

it('says the seconds instead of moving when motion is reduced, without announcing each one', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
  vi.useFakeTimers({ shouldAdvanceTime: true });
  renderApp(PAGE);
  await reveal('DATABASE_URL', 's1');
  expect(screen.queryByTestId('exposure-countdown')).not.toBeInTheDocument();
  const text = screen.getByText(/^(30|29)s$/);
  expect(text.closest('[role=status]')).toBeNull();
  act(() => void vi.advanceTimersByTime(10_000));
  expect(screen.getByText(/^(20|19)s$/)).toBeInTheDocument();
});
