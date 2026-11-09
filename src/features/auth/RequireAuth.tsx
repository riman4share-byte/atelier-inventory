import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) return <Navigate to="/setup" replace />;
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'signedOut') {
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />;
  }
  return <Outlet />;
}
