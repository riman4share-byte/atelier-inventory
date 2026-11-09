import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { SparkleIcon } from '@/components/icons';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Shown instead of a crash when the build has no project configured. This is
 * the first screen a developer sees after `npm run dev` on a fresh clone.
 */
export function SetupPage() {
  const { t } = useTranslation();

  if (isSupabaseConfigured) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-dvh bg-bg md:grid md:place-items-center md:p-6">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface md:min-h-0 md:rounded-sheet md:border md:border-line md:shadow-frame">
        <div className="flex justify-end px-4 pt-4">
          <LanguageToggle />
        </div>
        <div className="px-6 pb-10 pt-3">
          <div className="grid place-items-center rounded-card bg-c2 py-8 text-accent2">
            <SparkleIcon className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-hero">{t('setup.title')}</h1>
          <p className="mt-2 text-small leading-relaxed text-muted">{t('setup.body')}</p>
          <pre className="mt-5 overflow-x-auto rounded-field bg-soft p-3 text-caption text-ink" dir="ltr">
            <code>
              {'VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon-key>'}
            </code>
          </pre>
          <p className="mt-3 text-caption text-muted">{t('setup.vars')}</p>
          <p className="mt-1 text-caption text-muted">{t('setup.docs')}</p>
        </div>
      </div>
    </div>
  );
}
