import type { LoginRequest, RegisterRequest, UserResponse } from '@minivault/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, use, useEffect, useMemo, useState } from 'react';
import { ApiError, api, setUnauthorizedHandler } from '@/services/api-client';

interface Session {
  status: 'loading' | 'signed-in' | 'signed-out' | 'error';
  user: UserResponse | null;
  error: unknown;
  /** True after the server refused a session that used to work. */
  expired: boolean;
  retry: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (account: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);
const ME = ['me'];

async function fetchMe(): Promise<UserResponse | null> {
  try {
    return await api<UserResponse>('/auth/me', { authEndpoint: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [expired, setExpired] = useState(false);
  const { data, error, isPending, isError, refetch } = useQuery({ queryKey: ME, queryFn: fetchMe, staleTime: Infinity });

  const actions = useMemo(() => {
    /** Everything cached belongs to the session that ends. */
    const end = () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== ME[0] });
      queryClient.getMutationCache().clear();
      queryClient.setQueryData(ME, null);
    };
    const login = async (credentials: LoginRequest) => {
      const { user } = await api<{ user: UserResponse }>('/auth/session', { method: 'POST', body: credentials, authEndpoint: true });
      setExpired(false);
      queryClient.setQueryData(ME, user);
    };
    return {
      login,
      register: async (account: RegisterRequest) => {
        await api<UserResponse>('/auth/register', { method: 'POST', body: account, authEndpoint: true });
        await login({ email: account.email, password: account.password });
      },
      logout: async () => {
        // The server must confirm: the cookie cannot be removed from here.
        await api<void>('/auth/session', { method: 'DELETE', authEndpoint: true });
        end();
      },
      expire: () => {
        setExpired(true);
        end();
      },
    };
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(actions.expire);
    return () => setUnauthorizedHandler(() => {});
  }, [actions]);

  const value = useMemo<Session>(() => {
    const status = isPending ? 'loading' : isError ? 'error' : data ? 'signed-in' : 'signed-out';
    const { login, register, logout } = actions;
    return { status, user: data ?? null, error, expired, retry: () => void refetch(), login, register, logout };
  }, [actions, data, error, expired, isError, isPending, refetch]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession needs a SessionProvider');
  return session;
}
