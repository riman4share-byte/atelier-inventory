import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GownIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <Panel className="w-full max-w-sm p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-field border border-line bg-surface-2 text-muted">
            <GownIcon className="h-4 w-4" />
          </span>
          <p className="eyebrow">{t('errors.title')}</p>
        </div>
        <h1 className="mt-3 text-title font-semibold tracking-tight text-ink">
          {t('errors.notFoundTitle')}
        </h1>
        <p className="mt-1.5 text-small text-muted">{t('errors.notFoundBody')}</p>
        <Button variant="secondary" fullWidth={false} className="mt-3 px-4" onClick={() => navigate('/dresses')}>
          {t('errors.notFoundBack')}
        </Button>
      </Panel>
    </div>
  );
}
