import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LockIcon } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';

export function ForbiddenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Screen title={t('settings.title')}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-card bg-c3 text-warn">
          <LockIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-2 text-title">{t('errors.forbiddenTitle')}</h2>
        <p className="max-w-[34ch] text-small text-muted">{t('errors.forbiddenBody')}</p>
        <Button variant="secondary" className="mt-3" onClick={() => navigate('/dresses')}>
          {t('errors.forbiddenBack')}
        </Button>
      </div>
    </Screen>
  );
}
