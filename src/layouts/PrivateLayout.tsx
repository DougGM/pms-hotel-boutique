import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PrivatePage } from '@/private/page';

const menuItems = ['Panel operativo'];

export function PrivateLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeItem = location.pathname.startsWith('/pms') ? 'Panel operativo' : '';

  return (
    <PrivatePage activeItem={activeItem} menuItems={menuItems} onNavigate={() => navigate('/pms')}>
      <Outlet />
    </PrivatePage>
  );
}
