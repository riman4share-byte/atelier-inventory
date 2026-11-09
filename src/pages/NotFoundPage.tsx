import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GownIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-card bg-c1 text-accent">
        <GownIcon className="h-12 w-auto" />
      </span>
      <h1 className="mt-2 text-title">{t('errors.notFoundTitle')}</h1>
      <p className="max-w-[34ch] text-small text-muted">{t('errors.notFoundBody')}</p>
      <Button variant="secondary" className="mt-3" onClick={() => navigate('/dresses')}>
        {t('errors.notFoundBack')}
      </Button>
    </div>
  );
}
