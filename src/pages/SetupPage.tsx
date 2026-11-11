import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { TerminalIcon } from '@/components/icons';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Shown instead of a crash when the build has no project configured. This is
 * the first screen a developer sees after `npm run dev` on a fresh clone.
 */
export function SetupPage() {
  const { t } = useTranslation();

  if (isSupabaseConfigured) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 pt-safe">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
          Atelier
        </span>
        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center">
        <div className="w-full max-w-sm rounded-card border border-line bg-surface">
          <div className="border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 shrink-0 text-accent" />
              <h1 className="text-title font-semibold tracking-tight text-ink">
                {t('setup.title')}
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 px-5 py-5">
            <p className="text-small leading-relaxed text-muted">{t('setup.body')}</p>
            <pre className="overflow-x-auto rounded-field border border-line bg-surface-2 p-2.5 font-mono text-[11px] leading-relaxed text-ink" dir="ltr">
              <code>
                {'VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon-key>'}
              </code>
            </pre>
            <p className="text-note text-muted">{t('setup.vars')}</p>
            <p className="text-note text-muted">{t('setup.docs')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
