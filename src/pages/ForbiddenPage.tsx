import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LockIcon } from '@/components/icons';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export function ForbiddenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Screen title={t('settings.title')}>
      <div className="flex flex-1 items-center justify-center py-8">
        <Panel className="w-full max-w-sm p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-field border border-line bg-surface-2 text-muted">
              <LockIcon className="h-4 w-4" />
            </span>
            <p className="eyebrow">{t('errors.title')}</p>
          </div>
          <h2 className="mt-3 text-title font-semibold tracking-tight text-ink">
            {t('errors.forbiddenTitle')}
          </h2>
          <p className="mt-1.5 text-small text-muted">{t('errors.forbiddenBody')}</p>
          <Button variant="secondary" fullWidth={false} className="mt-3 px-4" onClick={() => navigate('/dresses')}>
            {t('errors.forbiddenBack')}
          </Button>
        </Panel>
      </div>
    </Screen>
  );
}
