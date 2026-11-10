import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { CameraIcon, GemIcon, GownIcon, PersonIcon, SparkleIcon } from '@/components/icons';
import { cx } from '@/lib/cx';
import type { ComponentType, SVGProps } from 'react';

interface NavItem {
  to: string;
  labelKey: 'nav.home' | 'nav.dresses' | 'nav.capture' | 'nav.materials' | 'nav.account';
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const BASE_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.home', Icon: SparkleIcon },
  { to: '/dresses', labelKey: 'nav.dresses', Icon: GownIcon },
  { to: '/capture', labelKey: 'nav.capture', Icon: CameraIcon },
  { to: '/materials', labelKey: 'nav.materials', Icon: GemIcon },
];

// Every role gets the account tab: it is where sign-out lives, and a staff
// member on a shared tablet must always be able to lock the app.
const ACCOUNT_ITEM: NavItem = { to: '/account', labelKey: 'nav.account', Icon: PersonIcon };

export function BottomNav() {
  const { t } = useTranslation();
  const items = [...BASE_ITEMS, ACCOUNT_ITEM];

  return (
    <nav
      aria-label={t('nav.label')}
      className="border-t border-line bg-surface px-1.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))]"
    >
      <ul className="flex items-stretch">
        {items.map(({ to, labelKey, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cx(
                  'flex min-h-tap flex-col items-center justify-center gap-1 rounded-tile px-1 py-1 text-note leading-none',
                  isActive ? 'font-bold text-accent' : 'font-medium text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'grid h-[22px] w-[22px] place-items-center rounded-[7px]',
                      isActive ? 'bg-accent text-accent-ink' : 'bg-off-bg text-muted',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{t(labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
