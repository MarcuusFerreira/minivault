import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router';
import { SessionProvider } from '@/features/auth/session';

interface Props {
  router: ReturnType<typeof createBrowserRouter>;
  queryClient: QueryClient;
}

export function App({ router, queryClient }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
