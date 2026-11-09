import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/Spinner';

export function FullScreenLoader() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Spinner className="h-7 w-7 text-accent" />
        <span className="text-small">{t('common.loading')}</span>
      </div>
    </div>
  );
}
