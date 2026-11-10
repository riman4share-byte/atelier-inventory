import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

/** Listens for service-worker updates and offers a one-tap reload. */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className="pb-safe fixed inset-x-3 bottom-24 z-40 flex items-center gap-2 rounded-btn bg-gradient-to-r from-accent to-accent2 px-4 py-2 text-white shadow-frame">
      <span className="flex-1 text-small font-semibold">{t('pwa.updateAvailable')}</span>
      <Button variant="secondary" className="min-h-tap w-auto px-3" onClick={() => void updateServiceWorker(true)}>
        {t('pwa.reload')}
      </Button>
    </div>
  );
}
