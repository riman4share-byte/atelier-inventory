import { Outlet } from 'react-router-dom';
import { FullScreenLoader } from '@/components/layout/FullScreenLoader';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { useAuth } from './useAuth';

/** Admin-only branch. Staff who type /settings get a clear refusal, not a redirect loop. */
export function RequireAdmin() {
  const { profile, profileStatus } = useAuth();

  if (profileStatus === 'loading') return <FullScreenLoader />;
  if (!profile || profile.role !== 'admin') return <ForbiddenPage />;
  return <Outlet />;
}
