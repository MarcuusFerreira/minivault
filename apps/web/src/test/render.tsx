import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { App } from '@/app';
import { routes } from '@/routes/routes';
import { createQueryClient } from '@/services/query-client';

export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = createQueryClient();
  const view = render(<App router={router} queryClient={queryClient} />);
  return { router, queryClient, user: userEvent.setup(), ...view };
}

export const heading = (name: string | RegExp) => screen.findByRole('heading', { name });
