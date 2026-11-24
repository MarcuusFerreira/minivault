import { screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { expect, it } from 'vitest';
import { heading, renderApp } from '@/test/render';
import { backend, failure, server } from '@/test/server';

const signIn = async (user: ReturnType<typeof renderApp>['user']) => {
  await user.type(await screen.findByLabelText('Email'), 'user@example.test');
  await user.type(screen.getByLabelText('Password'), 'correct horse battery');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
};

it('signs in and opens the dashboard', async () => {
  backend.signedIn = false;
  const { user, router } = renderApp('/login');
  await signIn(user);
  await heading('Dashboard');
  expect(router.state.location.pathname).toBe('/');
});

it('returns to the page that required signing in', async () => {
  backend.signedIn = false;
  const { user, router } = renderApp('/projects?x=1');
  await signIn(user);
  await heading('Projects');
  expect(router.state.location.pathname + router.state.location.search).toBe('/projects?x=1');
});

it.each(['//evil.test', 'https://evil.test', '/\\evil.test', 'javascript:alert(1)'])('never redirects to %s', async (next) => {
  backend.signedIn = false;
  const { user, router } = renderApp(`/login?next=${encodeURIComponent(next)}`);
  await signIn(user);
  await heading('Dashboard');
  expect(router.state.location.pathname).toBe('/');
});

it('explains rejected credentials', async () => {
  backend.signedIn = false;
  server.use(http.post('*/api/v1/auth/session', () => failure(401, 'INVALID_CREDENTIALS')));
  const { user, router } = renderApp('/login');
  await signIn(user);
  expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  expect(router.state.location.pathname).toBe('/login');
});

it('explains rate limiting', async () => {
  backend.signedIn = false;
  server.use(http.post('*/api/v1/auth/session', () => failure(429, 'TOO_MANY_REQUESTS')));
  const { user } = renderApp('/login');
  await signIn(user);
  expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Wait a minute and try again.');
});

it('explains an unreachable server', async () => {
  backend.signedIn = false;
  server.use(http.post('*/api/v1/auth/session', () => Response.error()));
  const { user } = renderApp('/login');
  await signIn(user);
  expect(await screen.findByRole('alert')).toHaveTextContent('The server could not be reached. Try again.');
});

it('validates registration before sending it', async () => {
  backend.signedIn = false;
  const { user } = renderApp('/register');
  await user.type(await screen.findByLabelText('Name'), 'Test');
  await user.type(screen.getByLabelText('Email'), 'nope');
  await user.type(screen.getByLabelText('Password'), 'short');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  expect(screen.getByText('Use between 12 and 128 characters.')).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
});

it('registers and signs in', async () => {
  backend.signedIn = false;
  const { user } = renderApp('/register');
  await user.type(await screen.findByLabelText('Name'), 'Test');
  await user.type(screen.getByLabelText('Email'), 'user@example.test');
  await user.type(screen.getByLabelText('Password'), 'correct horse battery');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  await heading('Dashboard');
});

it('reports an email already registered', async () => {
  backend.signedIn = false;
  server.use(http.post('*/api/v1/auth/register', () => failure(409, 'EMAIL_ALREADY_REGISTERED')));
  const { user } = renderApp('/register');
  await user.type(await screen.findByLabelText('Name'), 'Test');
  await user.type(screen.getByLabelText('Email'), 'user@example.test');
  await user.type(screen.getByLabelText('Password'), 'correct horse battery');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('This email address is already registered.')).toBeInTheDocument();
});

it('signs out, leaving nothing in the cache', async () => {
  const { user, router, queryClient } = renderApp('/projects');
  await screen.findByRole('link', { name: 'Payments' });
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  await heading('Sign in');
  expect(router.state.location.pathname).toBe('/login');
  await waitFor(() => expect(JSON.stringify(queryClient.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('Payments'));
});

it('keeps no token in browser storage', async () => {
  backend.signedIn = false;
  const { user } = renderApp('/login');
  await signIn(user);
  await heading('Dashboard');
  expect(localStorage.length + sessionStorage.length).toBe(0);
});
