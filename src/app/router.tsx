import { createBrowserRouter } from 'react-router-dom';
import { PrivateLayout } from '@/layouts/PrivateLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoginPage } from '@/pages/LoginPage';
import { OperationsHomePage } from '@/pages/OperationsHomePage';
import { PublicHomePage } from '@/pages/PublicHomePage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <PublicHomePage /> },
      { path: '/login', element: <LoginPage /> },
    ],
  },
  {
    path: '/pms',
    element: <PrivateLayout />,
    children: [{ index: true, element: <OperationsHomePage /> }],
  },
]);
