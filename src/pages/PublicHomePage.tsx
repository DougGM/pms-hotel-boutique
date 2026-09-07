import { useNavigate } from 'react-router-dom';
import { PublicPage } from '@/public/page';
import { routePaths } from '@/app/routes';

export function PublicHomePage() {
  const navigate = useNavigate();
  return <PublicPage onLogin={() => navigate(routePaths.public.login)} />;
}
