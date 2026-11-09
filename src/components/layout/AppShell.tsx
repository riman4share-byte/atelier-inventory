import { Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { BottomNav } from './BottomNav';
import { ProfileError } from './ProfileError';

export function AppShell() {
  const { profileStatus, reloadProfile } = useAuth();

  return (
    <div className="min-h-dvh bg-bg md:grid md:place-items-center md:p-6">
      <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-surface md:h-[min(880px,calc(100dvh-3rem))] md:rounded-sheet md:border md:border-line md:shadow-frame">
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {profileStatus === 'error' ? <ProfileError onRetry={() => void reloadProfile()} /> : <Outlet />}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
