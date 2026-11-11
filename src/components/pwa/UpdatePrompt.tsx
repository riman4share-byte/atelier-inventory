import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { RefreshIcon } from '@/components/icons';

/** Listens for service-worker updates and offers a one-tap reload. */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className="pb-safe fixed inset-x-3 bottom-20 z-40 flex items-center gap-2 rounded-card border border-accent-line bg-accent-bg px-3 py-2 md:bottom-4">
      <RefreshIcon className="h-4 w-4 shrink-0 text-accent" />
      <span className="flex-1 text-small text-ink">{t('pwa.updateAvailable')}</span>
      <Button size="sm" className="w-auto px-2.5" onClick={() => void updateServiceWorker(true)}>
        {t('pwa.reload')}
      </Button>
    </div>
  );
}
