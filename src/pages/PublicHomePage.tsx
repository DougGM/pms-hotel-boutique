import { useNavigate } from 'react-router-dom';
import { PublicPage } from '@/public/page';

export function PublicHomePage() {
  const navigate = useNavigate();
  return <PublicPage onLogin={() => navigate('/login')} />;
}
