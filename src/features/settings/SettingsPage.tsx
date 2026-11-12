import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/layout/Screen';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PersonIcon } from '@/components/icons';
import { useAuth } from '@/features/auth/useAuth';
import type { LanguageCode } from '@/lib/database.types';

import { ToolsPanel } from './ToolsPanel';
import { BrandingPanel } from './BrandingPanel';

export function SettingsPage() {
  const { t } = useTranslation();
  const { profile, session, setLanguage, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) return null;

  const email = session?.user.email ?? '—';
  const roleLabel = t(profile.role === 'admin' ? 'auth.roleAdmin' : 'auth.roleStaff');

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <Screen title={t('settings.title')}>
      <div className="flex flex-1 flex-col gap-3">
        <Panel title={t('settings.account')}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-surface-2 text-muted">
              <PersonIcon className="h-4 w-4" />
            </span>
            <p className="min-w-0 truncate text-title font-semibold tracking-tight text-ink">
              {profile.full_name || email}
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
            value={profile.language}
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

        {profile.role === 'admin' ? <BrandingPanel /> : null}
        {profile.role === 'admin' ? <ToolsPanel /> : null}
      </div>
    </Screen>
  );
}
