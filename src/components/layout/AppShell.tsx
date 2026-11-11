import { Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { BottomNav } from './BottomNav';
import { ProfileError } from './ProfileError';

/**
 * Application shell.
 *
 * On a phone the navigation is a bottom bar. From the medium breakpoint up it
 * becomes a fixed left rail and the content takes the full width, so a 10-inch
 * tablet in the atelier is not stuck inside a 480px column.
 *
 * The DOM order is navigation-then-content; `flex-col-reverse` puts the nav
 * under the content on a phone and `md:flex-row` moves it to the left edge
 * on a tablet.
 */
export function AppShell() {
  const { profileStatus, reloadProfile } = useAuth();

  return (
    <div className="flex h-dvh flex-col-reverse overflow-hidden bg-bg md:flex-row">
      <BottomNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface md:border-l md:border-line">
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {profileStatus === 'error' ? <ProfileError onRetry={() => void reloadProfile()} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
