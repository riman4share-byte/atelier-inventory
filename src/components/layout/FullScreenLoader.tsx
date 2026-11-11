import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/Spinner';

export function FullScreenLoader() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="grid min-h-full place-items-center bg-bg px-6">
      <div className="flex flex-col items-center gap-2.5 text-muted">
        <Spinner className="h-5 w-5 text-accent" />
        <span className="eyebrow">{t('common.loading')}</span>
      </div>
    </div>
  );
}
