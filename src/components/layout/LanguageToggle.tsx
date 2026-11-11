import { useTranslation } from 'react-i18next';
import { GlobeIcon } from '@/components/icons';
import { useAuth } from '@/features/auth/useAuth';
import { isLanguage, type Language } from '@/i18n';
import { cx } from '@/lib/cx';

interface LanguageToggleProps {
  className?: string;
  tone?: 'default' | 'onAccent';
}

/** Compact EN/AR switch, styled as a labelled toggle rather than a chip. */
export function LanguageToggle({ className, tone = 'default' }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const { setLanguage } = useAuth();
  const current: Language = isLanguage(i18n.language) ? i18n.language : 'en';
  const next: Language = current === 'en' ? 'ar' : 'en';
  const nextLabel = next === 'ar' ? t('common.arabic') : t('common.english');

  return (
    <button
      type="button"
      aria-label={`${t('common.language')}: ${nextLabel}`}
      onClick={() => void setLanguage(next)}
      className={cx(
        'inline-flex h-8 items-center gap-1.5 rounded-field border px-2 text-caption font-semibold tracking-tight transition-colors',
        tone === 'onAccent'
          ? 'border-accent-ink/40 bg-accent-ink/10 text-accent-ink'
          : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      <GlobeIcon className="h-3.5 w-3.5" />
      <span className="font-mono text-[11px] tracking-tight">
        {next === 'ar' ? 'ع' : 'EN'}
      </span>
    </button>
  );
}
