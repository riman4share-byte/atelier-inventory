import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export function ProfileError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full flex-col justify-center gap-3 px-6 py-10 text-center">
      <h1 className="text-title">{t('errors.profileTitle')}</h1>
      <p className="text-small text-muted">{t('errors.profileBody')}</p>
      <Button variant="secondary" onClick={onRetry} className="mt-2">
        {t('common.retry')}
      </Button>
    </div>
  );
}
