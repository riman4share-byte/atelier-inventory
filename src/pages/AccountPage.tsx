import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Screen } from '@/components/layout/Screen';
import { PoweredBy } from '@/features/branding/PoweredBy';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ChevronRightIcon, PersonIcon } from '@/components/icons';
import { useAuth } from '@/features/auth/useAuth';
import type { LanguageCode } from '@/lib/database.types';

/**
 * The account screen. Every signed-in user can reach it, so a staff member on
 * a shared atelier tablet can always sign out. The admin-only settings live
 * behind a link from here and stay behind their own route guard.
 */
export function AccountPage() {
  const { t } = useTranslation();
  const { profile, session, setLanguage, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const email = session?.user.email ?? '-';
  const roleLabel = t(profile?.role === 'admin' ? 'auth.roleAdmin' : 'auth.roleStaff');

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <Screen title={t('account.title')}>
      <div className="flex flex-1 flex-col gap-3">
        <Panel title={t('settings.account')}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-surface-2 text-muted">
              <PersonIcon className="h-4 w-4" />
            </span>
            <p className="min-w-0 truncate text-title font-semibold tracking-tight text-ink">
              {profile?.full_name || email}
            </p>
          </div>
          <dl className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="eyebrow">{t('settings.email')}</dt>
              <dd className="min-w-0 truncate font-mono text-small tracking-tight text-ink" dir="ltr">
                {email}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="eyebrow">{t('settings.role')}</dt>
              <dd>
                <span className="inline-flex items-center rounded-pill border border-accent-line bg-accent-bg px-2 py-0.5 font-mono text-micro font-semibold uppercase tracking-widest text-accent">
                  {roleLabel}
                </span>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title={t('settings.language')}>
          <SegmentedControl<LanguageCode>
            label={t('settings.language')}
            value={profile?.language ?? 'en'}
            onChange={(language) => void setLanguage(language)}
            options={[
              { value: 'en', label: t('common.english') },
              { value: 'ar', label: t('common.arabic') },
            ]}
          />
          <p className="mt-2 text-note text-muted">{t('settings.languageHint')}</p>
        </Panel>

        <Panel title={t('theme.label')}>
          <ThemeToggle showLabel />
          <p className="mt-2 text-note text-muted">{t('theme.hint')}</p>
        </Panel>

        <Panel title={t('help.title')}>
          <Link
            to="/help"
            className="flex h-9 items-center justify-between gap-2 rounded-field border border-line bg-surface-2 px-2.5 text-small font-semibold text-ink transition-colors hover:border-line-strong hover:bg-surface-3"
          >
            {t('help.subtitle')}
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        </Panel>


        <Panel>
          <Button
            variant="secondary"
            fullWidth={false}
            className="px-4"
            loading={signingOut}
            onClick={() => void handleSignOut()}
          >
            {t('auth.signOut')}
          </Button>
        </Panel>

        <PoweredBy className="text-center" />
      </div>
    </Screen>
  );
}
