import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/useAuth';
import type { LanguageCode } from '@/lib/database.types';

import { ToolsPanel } from './ToolsPanel';

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
      <section className="rounded-card border border-line p-4">
        <h2 className="text-caption font-semibold text-muted">{t('settings.account')}</h2>
        <p className="mt-2 text-title">{profile.full_name || email}</p>
        <dl className="mt-3 space-y-2 text-small">
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted">{t('settings.email')}</dt>
            <dd className="min-w-0 truncate text-ink" dir="ltr">
              {email}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">{t('settings.role')}</dt>
            <dd>
              <span className="rounded-pill bg-soft px-2.5 py-1 text-note font-bold text-accent">
                {roleLabel}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-caption font-semibold text-muted">{t('settings.language')}</h2>
        <div className="mt-2">
          <SegmentedControl<LanguageCode>
            label={t('settings.language')}
            value={profile.language}
            onChange={(language) => void setLanguage(language)}
            options={[
              { value: 'en', label: t('common.english') },
              { value: 'ar', label: t('common.arabic') },
            ]}
          />
        </div>
        <p className="mt-2 text-caption text-muted">{t('settings.languageHint')}</p>
      </section>

      <Button variant="secondary" className="mt-8" loading={signingOut} onClick={() => void handleSignOut()}>
        {t('auth.signOut')}
      </Button>
      {profile.role === 'admin' ? <ToolsPanel /> : null}
    </Screen>
  );
}
