import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { AlertIcon } from '@/components/icons';

export function ProfileError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      <AlertIcon className="h-5 w-5 text-danger" />
      <h1 className="text-title font-semibold tracking-tight text-ink">{t('errors.profileTitle')}</h1>
      <p className="max-w-xs text-small text-muted">{t('errors.profileBody')}</p>
      <Button variant="secondary" className="mt-1 w-auto px-4" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </div>
  );
}
