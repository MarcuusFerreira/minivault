import type { RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { LoadingRows } from '@/components/ui/states';
import { RequireNoSession, RequireSession } from '@/features/auth/guards';
import { NotFound, RouteError } from './route-error';

const Loading = () => <LoadingRows label="Loading" />;

/** Each page is its own chunk. */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    HydrateFallback: Loading,
    children: [
      {
        element: <RequireNoSession />,
        children: [
          { path: '/login', lazy: () => import('@/features/auth/login-page') },
          { path: '/register', lazy: () => import('@/features/auth/register-page') },
        ],
      },
      {
        element: <RequireSession />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, lazy: () => import('@/features/dashboard/dashboard-page') },
              { path: '/projects', lazy: () => import('@/features/projects/projects-page') },
              {
                path: '/projects/:projectId',
                lazy: () => import('@/features/projects/project-layout'),
                children: [
                  { index: true, lazy: () => import('@/features/environments/environments-page') },
                  { path: 'api-keys', lazy: () => import('@/features/api-keys/api-keys-page') },
                  { path: ':environmentName', lazy: () => import('@/features/secrets/secrets-page') },
                ],
              },
              { path: '/audit', lazy: () => import('@/features/audit/audit-page') },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
];
