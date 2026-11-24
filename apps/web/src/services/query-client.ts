import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/** In memory only. Secret values and API keys never enter it: see features/secrets. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: (count, error) => error instanceof ApiError && (error.status === 0 || error.status >= 500) && count < 1,
        retryDelay: 300,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}
