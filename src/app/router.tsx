import { createBrowserRouter } from 'react-router-dom';
import { PrivateLayout } from '@/layouts/PrivateLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoginPage } from '@/pages/LoginPage';
import { OperationsHomePage } from '@/pages/OperationsHomePage';
import { PublicHomePage } from '@/pages/PublicHomePage';
import { PrivateNotFoundPage } from '@/private/pages/PrivateNotFoundPage';
import { PublicNotFoundPage } from '@/public/pages/PublicNotFoundPage';
import { routePaths } from '@/app/routes';
import { RequireSession } from '@/private/guards/RequireSession';
import { RequirePermission } from '@/private/guards/RequirePermission';
import { privateNavigation } from '@/private/routes/navigation';
import { ModuleHomePage } from '@/private/pages/ModuleHomePage';
import { ComponentsCatalogPage } from '@/public/pages/ComponentsCatalogPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: routePaths.public.home, element: <PublicHomePage /> },
      { path: routePaths.public.login, element: <LoginPage /> },
      { path: routePaths.public.legacyLogin, element: <LoginPage /> },
      { path: routePaths.public.components, element: <ComponentsCatalogPage /> },
      { path: routePaths.public.notFound, element: <PublicNotFoundPage /> },
    ],
  },
  {
    element: <RequireSession />,
    children: [
      {
        path: routePaths.pms.root,
        element: <PrivateLayout />,
        children: [
          { index: true, element: <OperationsHomePage /> },
          { path: routePaths.pms.dashboard, element: <OperationsHomePage /> },
          ...privateNavigation
            .filter((item) => item.path !== routePaths.pms.dashboard)
            .map((item) => ({
              path: item.path,
              element: <RequirePermission permission={item.permission} />,
              children: [
                { index: true, element: <ModuleHomePage title={item.label} /> },
                { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
              ],
            })),
          { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
        ],
      },
    ],
  },
]);
