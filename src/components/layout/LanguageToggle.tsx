import { useTranslation } from 'react-i18next';
import { GlobeIcon } from '@/components/icons';
import { useAuth } from '@/features/auth/useAuth';
import { isLanguage, type Language } from '@/i18n';
import { cx } from '@/lib/cx';

interface LanguageToggleProps {
  className?: string;
  tone?: 'default' | 'onBrand';
}

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
        'inline-flex min-h-tap items-center gap-1.5 rounded-pill px-3 text-caption font-semibold',
        tone === 'onBrand' ? 'bg-white/20 text-white' : 'bg-soft text-accent',
        className,
      )}
    >
      <GlobeIcon className="h-4 w-4" />
      <span>{next === 'ar' ? 'العربية' : 'EN'}</span>
    </button>
  );
}
