import { createBrowserRouter } from 'react-router-dom';
import { PrivateLayout } from '@/layouts/PrivateLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoginPage } from '@/pages/LoginPage';
import { OperationsHomePage } from '@/pages/OperationsHomePage';
import { PrivateNotFoundPage } from '@/private/pages/PrivateNotFoundPage';
import { PublicNotFoundPage } from '@/public/pages/PublicNotFoundPage';
import { routePaths } from '@/app/routes';
import { RequireSession } from '@/private/guards/RequireSession';
import { RequirePermission } from '@/private/guards/RequirePermission';
import { privateNavigation } from '@/private/routes/navigation';
import { ModuleHomePage } from '@/private/pages/ModuleHomePage';
import { ComponentsCatalogPage } from '@/public/pages/ComponentsCatalogPage';
import { SearchScreen } from '@/modules/booking-engine/screens/SearchScreen';
import { RoomDetailScreen } from '@/modules/booking-engine/screens/RoomDetailScreen';
import { BookingFormScreen } from '@/modules/booking-engine/screens/BookingFormScreen';
import { BookingConfirmationScreen } from '@/modules/booking-engine/screens/BookingConfirmationScreen';
import { RoomListScreen } from '@/modules/rooms/screens/RoomListScreen';
import { RoomFormScreen } from '@/modules/rooms/screens/RoomFormScreen';
import { RoomTypeListScreen } from '@/modules/rooms/screens/RoomTypeListScreen';
import { RoomTypeFormScreen } from '@/modules/rooms/screens/RoomTypeFormScreen';
import { OccupancyScreen } from '@/modules/occupancy/screens/OccupancyScreen';
import { ManualBookingScreen } from '@/modules/occupancy/screens/ManualBookingScreen';
import { CheckInScreen } from '@/modules/front-desk/screens/CheckInScreen';
import { GuestAccountScreen } from '@/modules/front-desk/screens/GuestAccountScreen';
import { CheckOutScreen } from '@/modules/front-desk/screens/CheckOutScreen';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: routePaths.public.home, element: <SearchScreen /> },
      { path: routePaths.public.roomTypeDetail, element: <RoomDetailScreen /> },
      { path: routePaths.public.bookingNew, element: <BookingFormScreen /> },
      { path: routePaths.public.bookingConfirmation, element: <BookingConfirmationScreen /> },
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
          {
            path: routePaths.pms.rooms,
            element: <RequirePermission permission="rooms:manage" />,
            children: [
              { index: true, element: <RoomListScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.roomNew,
            element: <RequirePermission permission="rooms:manage" />,
            children: [
              { index: true, element: <RoomFormScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.roomEdit,
            element: <RequirePermission permission="rooms:manage" />,
            children: [
              { index: true, element: <RoomFormScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.roomTypes,
            element: <RequirePermission permission="rooms:manage" />,
            children: [
              { index: true, element: <RoomTypeListScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.roomTypeNew,
            element: <RequirePermission permission="rooms:manage" />,
            children: [
              { index: true, element: <RoomTypeFormScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.occupancy,
            element: <RequirePermission permission="occupancy:view" />,
            children: [
              { index: true, element: <OccupancyScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.manualBookingNew,
            element: <RequirePermission permission="occupancy:view" />,
            children: [
              { index: true, element: <ManualBookingScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.checkIn,
            element: <RequirePermission permission="front-desk:operate" />,
            children: [
              { index: true, element: <CheckInScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.guestAccount,
            element: <RequirePermission permission="front-desk:operate" />,
            children: [
              { index: true, element: <GuestAccountScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          {
            path: routePaths.pms.checkOut,
            element: <RequirePermission permission="front-desk:operate" />,
            children: [
              { index: true, element: <CheckOutScreen /> },
              { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
            ],
          },
          { path: routePaths.pms.notFound, element: <PrivateNotFoundPage /> },
        ],
      },
    ],
  },
]);
