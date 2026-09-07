import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PrivatePage } from '@/private/page';
import { routePaths } from '@/app/routes';

const menuItems = ['Panel operativo'];

export function PrivateLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeItem = [routePaths.pms.root, routePaths.pms.dashboard].some(
    (path) => path === location.pathname.replace(/\/$/, ''),
  )
    ? 'Panel operativo'
    : '';

  return (
    <PrivatePage
      activeItem={activeItem}
      menuItems={menuItems}
      onNavigate={() => navigate(routePaths.pms.dashboard)}
    >
      <Outlet />
    </PrivatePage>
  );
}
