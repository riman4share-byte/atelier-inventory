import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import {
  BoxesIcon,
  CalendarIcon,
  CameraIcon,
  GownIcon,
  GridIcon,
  PersonIcon,
} from '@/components/icons';
import { cx } from '@/lib/cx';
import type { ComponentType, SVGProps } from 'react';

interface NavItem {
  to: string;
  labelKey: 'nav.home' | 'nav.dresses' | 'nav.dates' | 'nav.capture' | 'nav.materials' | 'nav.account';
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Navigation.
 *
 * Phone: a bottom bar of cells. Tablet and up: a 56px left rail with an
 * active indicator. Same markup, no second component to keep in sync.
 *
 * Materials is a back-office screen, so it only appears for admins. Sales
 * staff see Home, Dresses, Free dates, Capture and Account — the things they
 * use every day.
 */
export function BottomNav() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';

  const items: NavItem[] = [
    { to: '/dashboard', labelKey: 'nav.home', Icon: GridIcon },
    { to: '/dresses', labelKey: 'nav.dresses', Icon: GownIcon },
    { to: '/availability', labelKey: 'nav.dates', Icon: CalendarIcon },
    { to: '/capture', labelKey: 'nav.capture', Icon: CameraIcon },
    ...(isAdmin ? [{ to: '/materials', labelKey: 'nav.materials' as const, Icon: BoxesIcon }] : []),
    // Every role gets the account tab: it is where sign-out lives, and a staff
    // member on a shared tablet must always be able to lock the app.
    { to: '/account', labelKey: 'nav.account', Icon: PersonIcon },
  ];

  return (
    <nav
      aria-label={t('nav.label')}
      className="shrink-0 border-t border-line bg-surface md:h-full md:w-14 md:border-r md:border-t-0"
    >
      <ul className="flex h-full items-stretch md:flex-col md:justify-start md:pt-2">
        {items.map(({ to, labelKey, Icon }) => (
          <li key={to} className="flex-1 md:flex-none">
            <NavLink
              to={to}
              title={t(labelKey)}
              className={({ isActive }) =>
                cx(
                  'group relative flex h-full min-h-tap flex-col items-center justify-center gap-1 px-1 py-2 md:h-12 md:w-full md:gap-0',
                  isActive ? 'text-accent' : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator: a 2px rule, not a filled pill. */}
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute top-0 h-0.5 w-6 bg-accent transition-opacity md:top-1/2 md:right-0 md:left-auto md:h-6 md:w-0.5 md:-translate-y-1/2',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 1.8 : 1.5} />
                  <span
                    className={cx(
                      'text-[10px] leading-none tracking-tight md:sr-only',
                      isActive ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {t(labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
